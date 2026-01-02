import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  useEffect(() => {
    // Same "reveal on scroll" behavior as your HTML
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="container">
      {/* Top info sections */}
      <section className="info-sections">
        <div className="content-box reveal">
          <h2>Secure &amp; Seamless LAN File Sharing</h2>
          <p>
            Setu Sharing is engineered for developers, professionals, and teams
            who demand <strong>fast, secure, and ephemeral file transfer</strong>{" "}
            across a local area network (LAN). By leveraging modern Python and
            Flask architecture, we provide a private, self-hosted alternative to
            cloud-based services.
          </p>
          <p>
            This project gives you <strong>complete control</strong> over your
            data, ensuring that sensitive files are shared directly,
            password-protected, and automatically expire, removing risk and
            maximizing efficiency.
          </p>
        </div>

        <div className="content-box reveal">
          <h2>The Edge: Speed, Control, and Privacy</h2>
          <ul className="features-list">
            <li>
              <span className="icon-badge">⚡</span>
              <span>
                <strong>Blazing Fast LAN Speed:</strong> Transfer files at the
                maximum speed of your local network, bypassing internet upload
                limits.
              </span>
            </li>
            <li>
              <span className="icon-badge">🔐</span>
              <span>
                <strong>Session-Based Security:</strong> Every share is secured
                with a unique token, time-based expiry, and an explicit password
                requirement, ensuring zero unauthorized access.
              </span>
            </li>
            <li>
              <span className="icon-badge">✅</span>
              <span>
                <strong>Simplified Administration:</strong> A clean interface
                allows you to create, monitor, and revoke shares instantly,
                putting you in full command of your data flow.
              </span>
            </li>
            <li>
              <span className="icon-badge">📱</span>
              <span>
                <strong>Instant Mobile Access:</strong> Seamless QR code
                generation enables recipients to authenticate and download files
                instantly on any device.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Start sharing CTA */}
      <section className="start-section reveal">
        <h3>Start Your Secure Transfer Now</h3>
        <Link to="/sender" className="start-button" aria-label="Start Sharing">
          <span className="start-icon">📤</span>
        </Link>
        <p className="cta-text">
          Click to begin creating a new private share session.
        </p>
      </section>

      {/* How to share section */}
      <section className="how-to-share reveal">
        <h3>Deployment &amp; Quick Share Procedure</h3>
        <ol>
          <li>
            <strong>Deployment:</strong> Run the Flask application (<code>
              app.py
            </code>
            ) on your server.
          </li>
          <li>
            <strong>Access Admin:</strong> Navigate to the server&apos;s root
            URL (<code>/</code>) on your browser.
          </li>
          <li>
            <strong>Configure Share:</strong> Provide the directory path, set a{" "}
            <strong>strong, unique password</strong>, and define the expiry
            time (in minutes).
          </li>
          <li>
            <strong>Generate &amp; Share:</strong> The system instantly
            generates a secure link and a scannable QR code (containing your
            network IP) for distribution.
          </li>
          <li>
            <strong>Recipient Access:</strong> The recipient uses the link and
            the provided password to securely access and download the files.
          </li>
        </ol>
      </section>
    </div>
  );
};

export default Home;
