from fastapi import FastAPI

app = FastAPI(title="BHP Console API")

@app.get("/health")
def health():
    return {"status": "ok"}
