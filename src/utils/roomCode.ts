const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O to avoid confusion

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
