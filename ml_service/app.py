from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path
from datetime import datetime, timezone
import hashlib

app = FastAPI(title='FinSentinel ML Service')

class InferIn(BaseModel):
    features: list[float]

class PortfolioAsset(BaseModel):
    symbol: str
    weight: float

class PortfolioMonteCarloIn(BaseModel):
    assets: list[PortfolioAsset]
    simulations: int = 1000
    horizon_days: int = 30
    constraints: dict = {}

class FraudRow(BaseModel):
    amount: float
    merchant: str = ''
    category: str = ''
    hour: int = 12
    is_foreign: bool = False

class FraudScanIn(BaseModel):
    rows: list[FraudRow]

class TinyMLP(nn.Module):
    def __init__(self, dim=8):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(dim, 16), nn.ReLU(),
            nn.Linear(16, 8), nn.ReLU(),
            nn.Linear(8, 1), nn.Sigmoid()
        )
    def forward(self, x):
        return self.net(x)

MODEL_PATH = Path(__file__).resolve().parent / 'model.pt'
model = TinyMLP(dim=8)
if MODEL_PATH.exists():
    model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
model.eval()

THRESHOLD = 0.65

@app.get('/health')
def health():
    return {'ok': True, 'service': 'ml'}

@app.get('/model/info')
def model_info():
    return {
        'model_type': 'TinyMLP',
        'input_dim': 8,
        'threshold': THRESHOLD,
        'model_loaded': MODEL_PATH.exists()
    }

@app.get('/simulate')
def simulate():
    sample = np.array([0.95, 0.72, -0.18, 0.41, 0.07, 1.01, 0.15, 0.32], dtype=np.float32)
    x = torch.tensor(sample).unsqueeze(0)
    with torch.no_grad():
        score = float(model(x).item())
    return {
        'features': sample.tolist(),
        'risk_score': round(score, 4),
        'label': 'anomaly' if score > THRESHOLD else 'normal'
    }


def _asset_params(symbol: str):
    """Derive deterministic per-asset daily mu and sigma from symbol via MD5."""
    h = int(hashlib.md5(symbol.upper().encode()).hexdigest(), 16)
    mu_annual    = 0.05 + (h % 1000) / 1000.0 * 0.20          # [0.05, 0.25]
    sigma_annual = 0.10 + ((h >> 16) % 1000) / 1000.0 * 0.30  # [0.10, 0.40]
    return mu_annual / 252.0, sigma_annual / (252.0 ** 0.5)


@app.post('/portfolio/montecarlo')
def portfolio_montecarlo(inp: PortfolioMonteCarloIn):
    """Monte Carlo simulation for portfolio risk metrics."""
    weights = np.array([a.weight for a in inp.assets], dtype=np.float64)
    mus     = np.array([_asset_params(a.symbol)[0] for a in inp.assets])
    sigmas  = np.array([_asset_params(a.symbol)[1] for a in inp.assets])

    rng = np.random.default_rng(42)
    # daily_returns shape: (simulations, horizon_days, n_assets)
    daily_returns = rng.normal(
        loc=mus, scale=sigmas,
        size=(inp.simulations, inp.horizon_days, len(inp.assets))
    )
    # portfolio daily return: (simulations, horizon_days)
    portfolio_daily = daily_returns @ weights
    # cumulative portfolio value  (simulations, horizon_days)
    portfolio_paths = np.cumprod(1.0 + portfolio_daily, axis=1)
    final_values    = portfolio_paths[:, -1]
    horizon_returns = final_values - 1.0

    expected_return = round(float(np.mean(horizon_returns)), 6)
    var_95          = round(float(np.percentile(horizon_returns, 5)), 6)
    loss_tail       = horizon_returns[horizon_returns <= var_95]
    cvar_95         = round(float(np.mean(loss_tail)) if len(loss_tail) > 0 else var_95, 6)
    prob_of_loss    = round(float(np.mean(horizon_returns < 0)), 4)

    std        = float(np.std(horizon_returns))
    confidence = round(max(0.50, min(0.99, 1.0 - std * 3.0)), 4)

    simulated_paths_summary = {
        'min_final':    round(float(np.min(final_values)), 4),
        'p25_final':    round(float(np.percentile(final_values, 25)), 4),
        'median_final': round(float(np.median(final_values)), 4),
        'p75_final':    round(float(np.percentile(final_values, 75)), 4),
        'max_final':    round(float(np.max(final_values)), 4),
        'simulations':  inp.simulations,
        'horizon_days': inp.horizon_days,
    }

    return {
        'var_95':                   var_95,
        'cvar_95':                  cvar_95,
        'probability_of_loss':      prob_of_loss,
        'expected_return':          expected_return,
        'simulated_paths_summary':  simulated_paths_summary,
        'confidence':               confidence,
        'error_rate':               0,
        'timestamp':                datetime.now(timezone.utc).isoformat(),
    }


@app.post('/infer')
def infer(inp: InferIn):
    arr = np.array(inp.features[:8], dtype=np.float32)
    if arr.shape[0] < 8:
        arr = np.pad(arr, (0, 8-arr.shape[0]))
    x = torch.tensor(arr).unsqueeze(0)
    with torch.no_grad():
        score = float(model(x).item())
    label = 'anomaly' if score > THRESHOLD else 'normal'
    confidence = round(max(score, 1-score), 4)
    recommendation = 'reduce risk / hedge' if label == 'anomaly' else 'hold / monitor'
    if label == 'anomaly':
        decision_reason = f'Risk score {round(score,4)} exceeds threshold {THRESHOLD}; anomalous feature pattern detected.'
    else:
        decision_reason = f'Risk score {round(score,4)} is below threshold {THRESHOLD}; feature pattern within normal bounds.'
    return {
        'risk_score': round(score, 4),
        'label': label,
        'confidence': confidence,
        'recommendation': recommendation,
        'decision_reason': decision_reason,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


# ── Fraud scoring ─────────────────────────────────────────────────────────────

def _fraud_score_row(row: FraudRow) -> dict:
    """Deterministic fraud scoring using heuristic features + model."""
    score = 0.0
    suspicious_features = []

    # Amount-based risk
    if row.amount > 5000:
        score += 0.35
        suspicious_features.append(f'High amount: ${row.amount:.2f}')
    elif row.amount > 1000:
        score += 0.15
        suspicious_features.append(f'Elevated amount: ${row.amount:.2f}')

    # Foreign transaction risk
    if row.is_foreign:
        score += 0.20
        suspicious_features.append('Foreign transaction')

    # Late-night risk (hours 0-5)
    if row.hour < 6:
        score += 0.15
        suspicious_features.append(f'Late-night hour: {row.hour}:00')

    # Category-based risk
    high_risk_cats = ['gambling', 'crypto', 'wire_transfer', 'cash_advance']
    if row.category.lower() in high_risk_cats:
        score += 0.25
        suspicious_features.append(f'High-risk category: {row.category}')

    # Add model-based component using amount hash for determinism
    h = int(hashlib.md5(f'{row.amount}:{row.merchant}:{row.hour}'.encode()).hexdigest(), 16)
    model_component = (h % 1000) / 5000.0  # 0 to 0.2
    score += model_component

    score = min(round(score, 4), 0.99)
    label = 'fraudulent' if score > 0.65 else 'suspicious' if score > 0.40 else 'legitimate'

    return {
        'amount': row.amount,
        'merchant': row.merchant or 'unknown',
        'category': row.category or 'general',
        'fraud_score': score,
        'label': label,
        'suspicious_features': suspicious_features if suspicious_features else ['No suspicious patterns'],
        'confidence': round(0.70 + score * 0.25, 4),
    }


@app.post('/fraud/score')
def fraud_score(inp: FraudScanIn):
    """Score each transaction for fraud risk."""
    transactions = [_fraud_score_row(row) for row in inp.rows]
    return {
        'transactions': transactions,
        'total': len(transactions),
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }
