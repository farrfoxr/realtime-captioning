### 🔥 See the full demo on YouTube: [Youtube Video, Click Here](https://youtu.be/ECPqEtfY_1U)

---

# Real-Time Local Image Captioning on RTX-3070

This project started because I wanted to answer a simple question:
**Can I build a fully offline, real-time image captioning system that runs on my own GPU without relying on cloud APIs?**

I didn’t want "just another script" that processes a folder of images. I wanted something that feels alive. A live webcam feed, captions updating every few seconds, everything happening instantly on my machine.

## Where it began

When I first started, I had no clue which vision-language model could run fast enough locally. I kept bouncing between documentation for Ollama, Hugging Face, Qwen VL, LLaVA and a few others. A lot of them looked powerful, but most either needed too much VRAM, were too slow, or relied on cloud processing.

Eventually I landed on **MoonDream**. The architecture uses SigLIP for visual encoding and Phi for language. It looked lightweight so I tried it. It immediately gave the best combination of speed and coherent captions on my **RTX-3070**, consistently under **2 seconds per inference**.

That was the moment where I knew I could actually make this work.

## The unexpected wall

I thought connecting everything would be easy. It wasn’t.
WSL kept blocking NVIDIA GPU acceleration and I couldn’t get CUDA exposed. Every attempt resulted in CPU inference which was too slow to be "real-time".

I had to solve this chain of problems one by one:

* Fix NVIDIA drivers that worked with WSL
* Match CUDA versions with Torch versions
* Set environment paths manually so FastAPI could see the GPU
* Rebuild CUDA-enabled Python wheels when torch refused to bind

After hours of debugging, the first inference log finally printed **"cuda:0"**. That was the turning point. The moment I saw that, I knew the rest of the system was just engineering.

## Building the loop

Once the backend was stable, the rest of the project became about performance.
The slowest part wasn’t actually inference, it was **data transfer**.

Sending images from the Next.js frontend to FastAPI using base64 or JSON was too heavy. So I switched to **binary multipart uploads**. That alone cut transfer time dramatically and made everything feel instant.

After that, the loop was complete:

1. Next.js grabs a webcam frame every 3 seconds
2. Sends the frame as binary to FastAPI
3. MoonDream runs inference on GPU
4. Server returns caption and inference time
5. UI updates live in the corner of the screen

When everything synced for the first time, the caption appeared almost at the exact moment the object was in the camera frame. It finally felt like a *real* product, not just a prototype.

## What I learned

This project wasn’t about "using cool tech". It was a reminder that:

* Real-time AI is mostly about **latency and data flow**
* Running models locally can be faster than cloud if optimized correctly
* GPU access on Windows is harder than it should be
* Vision inference feels more alive when data never leaves the device

I didn’t build this for competition or show. I built it because I wanted that moment where the model sees the world through the webcam and responds instantly.

And that moment genuinely felt worth the struggle.