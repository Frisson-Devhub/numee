"use client";

import { useEffect, useState } from "react";

const WORDS = ["You", "Your Motivation", "Your Interests", "Your Professional Skills"];

export default function Typewriter() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState(WORDS[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === fullText) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % WORDS.length);
      timeout = setTimeout(() => {}, 500);
    } else {
      const delta = isDeleting ? 100 : 150;
      timeout = setTimeout(() => {
        setText(
          isDeleting
            ? fullText.substring(0, text.length - 1)
            : fullText.substring(0, text.length + 1)
        );
      }, delta);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex]);

  return (
    <a
      href=""
      style={{ fontWeight: 600, textDecoration: "underline", fontSize: "24px" }}
      className="typewrite text-white"
      onClick={(e) => e.preventDefault()}
    >
      <span className="wrap">{text}</span>
    </a>
  );
}
