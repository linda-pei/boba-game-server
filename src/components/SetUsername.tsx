import { useState } from "react";

interface SetUsernameProps {
  onSubmit: (username: string) => void;
}

export default function SetUsername({ onSubmit }: SetUsernameProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="set-username screen">
      <h2>Choose a Username</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={!name.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}
