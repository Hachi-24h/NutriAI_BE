from google.cloud import storage
from io import BytesIO
from PIL import Image
from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader
import torch, torch.nn as nn, torch.optim as optim
import os, random
from tqdm import tqdm

# =============================
# 1️⃣ KẾT NỐI GOOGLE CLOUD
# =============================
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service-account.json"
BUCKET_NAME = "nutriai_kltn"
DATA_PREFIX = "dataset_merged/dataset_merged/train/"
VAL_PREFIX = "dataset_merged/dataset_merged/val/"

client = storage.Client()
bucket = client.bucket(BUCKET_NAME)

# =============================
# 2️⃣ CUSTOM DATASET TỪ GCS
# =============================
class GCSImageDataset(Dataset):
    def __init__(self, prefix, transform=None):
        self.prefix = prefix
        self.transform = transform
        self.blobs = list(client.list_blobs(BUCKET_NAME, prefix=prefix))
        self.samples = [
            blob for blob in self.blobs if blob.name.lower().endswith(('.jpg', '.jpeg', '.png'))
        ]
        print(f"📦 Loaded {len(self.samples)} images from {prefix}")

        # Lấy danh sách nhãn
        self.classes = sorted(list(set([b.name.split('/')[2] for b in self.samples])))
        self.class_to_idx = {cls: i for i, cls in enumerate(self.classes)}

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        blob = self.samples[idx]
        img_bytes = blob.download_as_bytes()
        img = Image.open(BytesIO(img_bytes)).convert("RGB")

        label_name = blob.name.split("/")[2]
        label = self.class_to_idx[label_name]

        if self.transform:
            img = self.transform(img)

        return img, label

# =============================
# 3️⃣ TRANSFORMS
# =============================
transform = {
    "train": transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(0.2, 0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ]),
    "val": transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
}

train_dataset = GCSImageDataset(DATA_PREFIX, transform["train"])
val_dataset = GCSImageDataset(VAL_PREFIX, transform["val"])

train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=16)

# =============================
# 4️⃣ MODEL + TRAINING
# =============================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.resnet18(pretrained=True)
model.fc = nn.Linear(model.fc.in_features, len(train_dataset.classes))
model = model.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

best_acc = 0

for epoch in range(5):  # train ít thôi để test
    print(f"\n===== Epoch {epoch+1} =====")
    model.train()
    running_correct, total = 0, 0

    for imgs, labels in tqdm(train_loader, desc="Training"):
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(imgs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        _, preds = outputs.max(1)
        running_correct += preds.eq(labels).sum().item()
        total += labels.size(0)

    acc = 100 * running_correct / total
    print(f"Train accuracy: {acc:.2f}%")

    # Validation
    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for imgs, labels in tqdm(val_loader, desc="Validation"):
            imgs, labels = imgs.to(device), labels.to(device)
            outputs = model(imgs)
            _, preds = outputs.max(1)
            correct += preds.eq(labels).sum().item()
            total += labels.size(0)

    val_acc = 100 * correct / total
    print(f"Validation accuracy: {val_acc:.2f}%")

    if val_acc > best_acc:
        best_acc = val_acc
        torch.save(model.state_dict(), "resnet18_best.pth")
        print("✅ Saved best model!")

print(f"🎯 Training completed, best val acc = {best_acc:.2f}%")
