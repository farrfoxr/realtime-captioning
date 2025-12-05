from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoModelForCausalLM
from PIL import Image
import torch
import io

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model (Global)
print("Loading Moondream2 model...")
model = AutoModelForCausalLM.from_pretrained(
    "vikhyatk/moondream2",
    trust_remote_code=True,
    dtype=torch.bfloat16,
    device_map="cuda",
)
print("Model loaded successfully!")

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        # Read image into memory
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Generate caption
        caption = model.caption(image, length="short")["caption"]
        
        return {"status": "success", "caption": caption}
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
