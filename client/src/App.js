import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const phases = [
  "Phase 1. 정리 및 분석",
  "Phase 2. 교사 피드백",
  "Phase 3. 교과 세특 작성",
  "Phase 4. 입학사정관 피드백",
  "Phase 5. 최종 세특 완성"
];

function App() {
  const [userPrompt, setUserPrompt] = useState("");
  const [files, setFiles] = useState([]);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [responses, setResponses] = useState(Array(phases.length).fill(""));
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    setResponse(responses[phase] || "");
    setEditing(false);
    setEditedText(responses[phase] || "");
  }, [phase, responses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse("");

    const formData = new FormData();

    let combinedPreviousResponses = "";
    for (let i = 0; i < phase; i++) {
      if (responses[i]) {
        combinedPreviousResponses += `\n\n[${phases[i]} 결과]\n` + responses[i];
      }
    }

    formData.append("phase_index", phase.toString());
    formData.append("phase_label", phases[phase]);
    formData.append(
      "user_prompt",
      `[${phases[phase]}]\n${userPrompt}\n\n이전 응답들:\n${combinedPreviousResponses}`
    );

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setResponse((prev) => prev + chunk);
      }

      setResponses((prev) => {
        const updated = [...prev];
        updated[phase] = fullResponse;
        return updated;
      });
    } catch (err) {
      setResponse("오류 발생: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToNextPhase = () => {
    if (phase < phases.length - 1) setPhase((prev) => prev + 1);
  };

  const goToPrevPhase = () => {
    if (phase > 0) setPhase((prev) => prev - 1);
  };

  const handleSaveEdit = () => {
    setResponses((prev) => {
      const updated = [...prev];
      updated[phase] = editedText;
      return updated;
    });
    setResponse(editedText);
    setEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    alert("응답이 복사되었습니다!");
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([response], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${phases[phase].replace(/\s+/g, "_")}_응답.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 md:p-6 flex flex-col md:flex-row">
      <div className="w-full md:w-1/4 mb-4 md:mb-0 md:pr-4">
        <div className="space-y-2">
          {phases.map((label, idx) => (
            <div
              key={idx}
              className={`p-2 md:p-3 rounded-lg shadow-md cursor-pointer text-sm font-medium truncate ${
                idx === phase ? "bg-blue-600 text-white" : "bg-white text-gray-800"
              }`}
              onClick={() => setPhase(idx)}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-3/4 bg-white p-4 md:p-6 rounded-lg shadow-lg">
        <h2 className="text-lg md:text-xl font-bold mb-4 text-blue-700">{phases[phase]}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">요청사항</label>
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="mt-1 block w-full p-3 border rounded-md shadow-sm"
              placeholder="예: 활동을 기반으로 분석해줘"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">파일 업로드</label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="mt-1 block w-full p-2 border rounded-md"
              required={phase === 0}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white p-3 rounded-md shadow hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "분석 중..." : `${phases[phase]} 요청`}
            </button>
            <button
              type="button"
              onClick={goToPrevPhase}
              disabled={phase === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              이전 단계
            </button>
            <button
              type="button"
              onClick={goToNextPhase}
              disabled={phase === phases.length - 1}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              다음 단계
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
            <h3 className="text-lg font-semibold">Gemini 응답</h3>
            <div className="flex flex-wrap gap-3 items-center">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  응답 편집
                </button>
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="text-sm text-green-600 hover:underline"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditedText(response);
                    }}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    취소
                  </button>
                </div>
              )}
              <button
                onClick={handleCopy}
                className="text-sm text-gray-600 hover:underline"
              >
                복사
              </button>
              <button
                onClick={handleDownload}
                className="text-sm text-gray-600 hover:underline"
              >
                다운로드
              </button>
            </div>
          </div>
          <div className="bg-gray-50 p-4 border rounded-md h-[300px] overflow-auto">
            {editing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-full p-2 border rounded resize-none text-sm"
              />
            ) : (
              <div className="prose max-w-none">
                <ReactMarkdown>{response || "아직 응답 없음"}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
