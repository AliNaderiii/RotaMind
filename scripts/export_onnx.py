"""
تبدیل PhyQ-TransNet به ONNX — اجرا روی سرور با GPU
python scripts/export_onnx.py --checkpoint PhyQ-Bearing/results/pu_cross_0to3_phyq_paper_seed0/best.pt --out software/rota-inference/model/phyq_paper.onnx
"""
import argparse, torch, json, pathlib

parser = argparse.ArgumentParser()
parser.add_argument("--checkpoint", required=True)
parser.add_argument("--out", required=True)
parser.add_argument("--quant", choices=["fp32","int8"], default="int8")
args = parser.parse_args()

# Mock for MVP — در محیط واقعی:
# from phyq.models import PhyQNet
# model = PhyQNet.from_yaml("configs/models/phyq_paper.yaml")
# model.load_state_dict(torch.load(args.checkpoint, map_location="cpu")["model"])
# model.eval()
# dummy = torch.randn(1,1,2048)
# torch.onnx.export(model, dummy, args.out, input_names=["input"], output_names=["logits"], dynamic_axes={"input":{0:"batch"}})
# print(f"Exported to {args.out}")

# برای MVP: یک فایل ONNX ساختگی می‌سازیم تا سرور بالا بیاید (در پایلوت واقعی جایگزین می‌شود)
print("⚠️  This is a stub. Run on a machine with PhyQ-Bearing installed to export real ONNX.")
print(f"Would export {args.checkpoint} -> {args.out} with {args.quant}")

# create dummy scaler
scaler = {"mean": 0.023, "std": 0.87, "fs": 12800, "window": 2048, "classes": ["Normal","Outer","Inner","Ball","Cage"]}
pathlib.Path("software/rota-inference/model/scaler.json").write_text(json.dumps(scaler, indent=2))
print("Created scaler.json")
