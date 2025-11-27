from flask import Flask, request, jsonify
from torchvision import models, transforms
from PIL import Image
import torch, torch.nn as nn
import io, base64, time, traceback, requests
from openai import OpenAI
from deep_translator import GoogleTranslator
import json
import os

# =========================
# 🔧 CONFIG
# =========================
MODEL_PATH = "resnet18_best.pth"
CLASSES_PATH = "classes.txt"

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
print("🔑 OPENAI_API_KEY =", OPENAI_KEY)
if not OPENAI_KEY:
    raise ValueError("❌ OPENAI_API_KEY is missing!")

client = OpenAI(api_key=OPENAI_KEY)

app = Flask(__name__)

# =========================
# 🧠 LOAD MODEL LOCAL
# =========================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.resnet18(pretrained=False)

with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    classes = [line.strip() for line in f.readlines()]

model.fc = nn.Linear(model.fc.in_features, len(classes))
state_dict = torch.load(MODEL_PATH, map_location=device)
filtered = {k: v for k, v in state_dict.items() if not k.startswith("fc.")}
model.load_state_dict(filtered, strict=False)
model.to(device)
model.eval()

# =========================
# 🖼️ IMAGE TRANSFORM
# =========================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# =========================
# 🚀 PREDICT ENDPOINT
# =========================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        start = time.time()
        image_bytes = None

        # Upload file
        if "file" in request.files:
            file = request.files["file"]
            image_bytes = file.read()

        # Image URL
        elif "image_url" in request.form or "image_url" in request.json:
            url = request.form.get("image_url") or request.json.get("image_url")
            response = requests.get(url)
            response.raise_for_status()
            image_bytes = response.content
        else:
            return jsonify({"error": "No file or image_url provided"}), 400

        # Load image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_t = transform(image).unsqueeze(0).to(device)

        # Local model predict
        with torch.no_grad():
          outputs = model(img_t)
          probs = torch.softmax(outputs, dim=1)
          conf, pred = torch.max(probs, 1)
          confidence = conf.item()
          local_pred = classes[pred.item()]

        print(f"📦 Local predicted: {local_pred} ({confidence:.2f})")

        # ==========================
        # 🔥 GPT REFINEMENT
        # ==========================
        if confidence < 0.3:
            print("🤖 Low confidence → GPT Vision refine")

            # Encode image as PNG base64
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")

            gpt_res = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """
You are a food recognition expert.
Return ONLY JSON:
{
  "en": "<english>",
  "vi": "<vietnamese>"
}
No markdown. No explanation.
"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Identify this food."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_b64}"
                                }
                            }
                        ]
                    }
                ]
            )

            raw = gpt_res.choices[0].message.content.strip()
            print("🔍 GPT output:", raw)

            try:
                data = json.loads(raw)
                food_en = data.get("en", "unknown")
                food_vi = data.get("vi", "không xác định")
            except Exception:
                food_en = local_pred
                food_vi = GoogleTranslator(source="en", target="vi").translate(food_en)

        else:
            food_en = local_pred
            food_vi = GoogleTranslator(source="en", target="vi").translate(local_pred)

        return jsonify({
            "food_en": food_en,
            "food_vi": food_vi,
            "confidence": round(confidence, 2)
        })

    except Exception as e:
        print("❌ Error:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5008)
