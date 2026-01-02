import React from "react";

const About = () => {
  return (
    <div className="card">
      <h2>About Setu Sharing</h2>
      <p>
        <strong>Setu Sharing</strong> is a secure, LAN-based file sharing
        platform engineered for fast, private and ephemeral transfers over your
        local network. It is designed and developed by <strong>Aayush Pareek</strong>.
      </p>

      <div style={{ marginTop: "1rem" }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Contact</h3>
        <p style={{ margin: "0.15rem 0" }}>
          <strong>Email:</strong>{" "}
          <a href="mailto:aayushpareek725@gmail.com">
            aayushpareek725@gmail.com
          </a>
        </p>
      </div>

      <div style={{ marginTop: "1.2rem" }}>
        <h3 style={{ marginBottom: "0.5rem" }}>Profiles</h3>

        <p style={{ margin: "0.15rem 0" }}>
          <strong>GitHub:</strong>{" "}
          <a
            href="https://github.com/725aayush"
            target="_blank"
            rel="noreferrer"
          >
            github.com/725aayush
          </a>
        </p>
        <p style={{ margin: "0.15rem 0" }}>
          <strong>LinkedIn:</strong>{" "}
          <a
            href="https://www.linkedin.com/in/aayush-pareek-565a53277"
            target="_blank"
            rel="noreferrer"
          >
            linkedin.com/in/aayush-pareek-565a53277
          </a>
        </p>

        <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <a
            href="https://github.com/725aayush"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            View GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/aayush-pareek-565a53277"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            View LinkedIn
          </a>
        </div>
      </div>

      <div style={{ marginTop: "1.4rem", fontSize: "0.85rem", opacity: 0.8 }}>
        <p style={{ margin: 0 }}>
          This project is part of an ongoing effort to build secure, self-hosted
          tools for developers and teams who value privacy and control.
        </p>
      </div>
    </div>
  );
};

export default About;
