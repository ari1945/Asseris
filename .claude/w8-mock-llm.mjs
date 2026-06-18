// W8 verification — a throwaway OpenAI-compatible mock upstream. Lets us prove the real
// env → readLlmConfig → provider → network → parse chain without a paid API key.
// Returns a canned chat-completion. Not committed-to-ship; a dev verification aid.
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 9999);

const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    // Echo a tiny proof that we received the (redacted) prompt, then a canned narration.
    let userLen = 0;
    try { userLen = JSON.parse(body).messages?.find((m) => m.role === 'user')?.content?.length ?? 0; } catch {}
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{ message: { content: `Ringkasan diagnostik (mock). Menerima ${userLen} karakter teks temuan ter-redaksi. Tema utama: risiko override manajemen & beda permanen fiskal — telaah otorisasi jurnal dan rekonsiliasi tarif efektif.` } }],
      usage: { prompt_tokens: 100, completion_tokens: 42 },
    }));
  });
});

server.listen(PORT, () => console.log(`mock-llm upstream on http://localhost:${PORT}`));
