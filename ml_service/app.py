from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path

app = FastAPI(title='FinSentinel ML Service')

class InferIn(BaseModel):
    features: list[float]

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

@app.get('/health')
def health():
    return {'ok': True, 'service': 'ml'}

@app.get('/simulate')
def simulate():
    sample = np.array([0.95, 0.72, -0.18, 0.41, 0.07, 1.01, 0.15, 0.32], dtype=np.float32)
    x = torch.tensor(sample).unsqueeze(0)
    with torch.no_grad():
        score = float(model(x).item())
    return {
        'features': sample.tolist(),
        'risk_score': round(score, 4),
        'label': 'anomaly' if score > 0.65 else 'normal'
    }


@app.post('/infer')
def infer(inp: InferIn):
    arr = np.array(inp.features[:8], dtype=np.float32)
    if arr.shape[0] < 8:
        arr = np.pad(arr, (0, 8-arr.shape[0]))
    x = torch.tensor(arr).unsqueeze(0)
    with torch.no_grad():
        score = float(model(x).item())
    label = 'anomaly' if score > 0.65 else 'normal'
    confidence = round(max(score, 1-score), 4)
    recommendation = 'reduce risk / hedge' if label == 'anomaly' else 'hold / monitor'
    return {
        'risk_score': round(score, 4),
        'label': label,
        'confidence': confidence,
        'recommendation': recommendation
    }
