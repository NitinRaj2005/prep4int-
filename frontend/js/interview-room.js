(() => {
  const root = document.getElementById("interview-room");
  if (!root) return;
  const id = root.dataset.sessionId;
  const $ = (name) => document.getElementById(name);
  let questionNumber = 1;
  let recognition = null;\n  let lastAnswerMode = "text";
  let timerSeconds = 30 * 60;
  let timerHandle = null;
  const setError = message => { $("room-error").textContent = message || ""; };
  const safeList = (target, values) => {
    const list = $(target); list.replaceChildren();
    (Array.isArray(values) ? values : []).forEach(value => { const li = document.createElement("li"); li.textContent = value; list.append(li); });
    if (!list.children.length) { const li = document.createElement("li"); li.textContent = "No items recorded."; list.append(li); }
  };
  const showQuestion = (question, number, total) => {
    questionNumber = number;
    $("room-loading").hidden = true;
    $("feedback-panel").hidden = true;
    $("report-panel").hidden = true;
    $("question-panel").hidden = false;
    $("question-text").textContent = question;
    $("candidate-answer").value = "";
    $("question-count").textContent = "Question " + number + " of " + total;
    $("progress-fill").style.width = (number / total * 100) + "%";
    $("room-subtitle").textContent = "Stay calm, think aloud, and explain your reasoning.";
  };
  const speak = text => {
    if (!("speechSynthesis" in window)) { $("voice-status").textContent = "Speech playback is not supported in this browser."; return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };
  const startTimer = () => {
    timerHandle = window.setInterval(() => {
      timerSeconds = Math.max(0, timerSeconds - 1);
      $("room-timer").textContent = String(Math.floor(timerSeconds / 60)).padStart(2,"0") + ":" + String(timerSeconds % 60).padStart(2,"0");
      if (timerSeconds === 0) {
        window.clearInterval(timerHandle);
        $("room-error").textContent = "Your 30-minute practice time is over. Please submit your current answer to finish.";
      }
    }, 1000);
  };
  const loadSession = async () => {
    try {
      const response = await fetch("/api/interview/" + encodeURIComponent(id), { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load interview.");
      const session = data.session;
      $("room-subtitle").textContent = session.role + " · " + session.category + " · " + session.difficulty;
      if (session.status === "completed") { showReport({ overallScore: session.overallScore, evaluation: session.evaluation, strengths: session.strengths, weaknesses: session.weaknesses, recommendations: session.recommendations }); return; }
      const pending = session.questions.find(q => !q.answer);
      if (!pending) throw new Error("No pending question found. Please return to your interview dashboard.");
      showQuestion(pending.question, session.questions.length, session.questionLimit);
      startTimer();
    } catch (error) { $("room-loading").hidden = true; setError(error.message); }
  };
  const showFeedback = (evaluation, nextQuestion, number, total) => {
    $("question-panel").hidden = true;
    $("feedback-panel").hidden = false;
    $("feedback-score").textContent = "Score: " + evaluation.score + " / 10";
    $("feedback-text").textContent = evaluation.feedback;
    safeList("feedback-strengths", evaluation.strengths);
    safeList("feedback-improvements", evaluation.improvements);
    $("continue-interview").textContent = nextQuestion ? "Next question →" : "View final report";
    $("continue-interview").onclick = () => nextQuestion ? showQuestion(nextQuestion, number, total) : null;
  };
  const showReport = report => {
    if (timerHandle) window.clearInterval(timerHandle);
    $("room-loading").hidden = true; $("question-panel").hidden = true; $("feedback-panel").hidden = true; $("report-panel").hidden = false;
    $("question-count").textContent = "Session completed"; $("progress-fill").style.width = "100%";
    $("overall-score").textContent = Math.round(report.overallScore || 0) + " / 100";
    const labels = [["Technical", "technicalKnowledge"],["Problem solving","problemSolving"],["Communication","communication"],["Confidence","confidence"]];
    $("score-grid").replaceChildren();
    labels.forEach(([label,key]) => { const card=document.createElement("div"); const score=document.createElement("strong"); score.textContent=(report.evaluation && report.evaluation[key] != null ? report.evaluation[key] : 0)+"/100"; const caption=document.createElement("span"); caption.textContent=label; card.append(score,caption); $("score-grid").append(card); });
    safeList("report-strengths", report.strengths); safeList("report-weaknesses", report.weaknesses); safeList("report-recommendations", report.recommendations);
  };
  $("speak-question").addEventListener("click", () => speak($("question-text").textContent));
  $("voice-answer").addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { $("voice-status").textContent = "Voice input is not supported here. Try Chrome or Edge."; return; }
    if (recognition) { recognition.stop(); recognition = null; $("voice-answer").innerHTML = '<i class="fa-solid fa-microphone"></i> Speak answer'; return; }
    lastAnswerMode = "voice";\n    recognition = new SpeechRecognition(); recognition.lang = "en-IN"; recognition.continuous = true; recognition.interimResults = true;
    const button = $("voice-answer"); button.innerHTML = '<i class="fa-solid fa-stop"></i> Stop recording'; $("voice-status").textContent = "Listening…";
    recognition.onresult = event => { let text = ""; for (let i=0;i<event.results.length;i++) text += event.results[i][0].transcript + (event.results[i].isFinal ? " " : ""); $("candidate-answer").value = text.slice(0,10000); };
    recognition.onerror = () => { $("voice-status").textContent = "Could not capture audio. Check microphone permission."; button.innerHTML = '<i class="fa-solid fa-microphone"></i> Speak answer'; recognition = null; };
    recognition.onend = () => { $("voice-status").textContent = "Voice capture stopped."; button.innerHTML = '<i class="fa-solid fa-microphone"></i> Speak answer'; recognition = null; };
    recognition.start();
  });
  $("submit-answer").addEventListener("click", async () => {
    const answer = $("candidate-answer").value.trim();
    if (!answer) { setError("Please enter or record your answer first."); return; }
    setError(""); const button = $("submit-answer"); button.disabled = true; button.textContent = "Evaluating answer…";
    try {
      const response = await fetch("/api/interview/" + encodeURIComponent(id) + "/answer", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({answer, answerMode: lastAnswerMode}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to submit answer.");
      if (data.completed) { $("question-panel").hidden = true; $("feedback-panel").hidden = false; $("feedback-score").textContent = "Final answer score: " + data.evaluation.score + " / 10"; $("feedback-text").textContent = data.evaluation.feedback; safeList("feedback-strengths",data.evaluation.strengths); safeList("feedback-improvements",data.evaluation.improvements); $("continue-interview").textContent = "View final report"; $("continue-interview").onclick = () => showReport(data.report); }
      else showFeedback(data.evaluation, data.question, data.questionNumber, data.totalQuestions);
    } catch (error) { setError(error.message); }
    finally { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit answer'; }
  });
  loadSession();
})();
