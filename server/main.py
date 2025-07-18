from typing import List
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from google.generativeai import types
from dotenv import load_dotenv
import os

load_dotenv()

genai.configure(api_key=os.environ.get("API_KEY"))
client = genai.GenerativeModel("gemini-2.0-flash")

# 0~5단계 시스템프롬프트 로딩
phase_prompts = []
for i in range(1,6):
    with open(f"phase_prompts/prompt_{i}.txt", "r", encoding="utf-8") as f:
        phase_prompts.append(f.read())

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze(
    phase_index: int = Form(...),
    phase_label: str = Form(...),
    user_prompt: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        contents = [phase_prompts[phase_index]]
        #print(contents)
        contents.append(user_prompt + "\n첨부파일:\n")

        for file in files:
            file_bytes = await file.read()
            mime_type = file.content_type

            if mime_type == "text/plain":
                file_content = file_bytes.decode("utf-8")
                contents.append(file_content)
            elif mime_type in ["application/pdf", "image/png", "image/jpeg"]:
                file_part = genai.Part.from_bytes(data=file_bytes, mime_type=mime_type)
                contents.append(file_part)
            else:
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Unsupported file type: {mime_type}"}
                )

        def gen():
            response = client.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=contents
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text

        return StreamingResponse(gen(), media_type="text/plain")

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
