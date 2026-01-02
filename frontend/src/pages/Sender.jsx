import React, { useEffect, useState } from "react";

const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000`;

const Sender = () => {
  const [ip, setIp] = useState("");
  const [dirpath, setDirpath] = useState("");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // suggested IP from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/suggest_ip`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ip) setIp(data.ip);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/share/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dirpath,
          password,
          ip,
          expiry_minutes: expiry,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create share");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.share_link) {
      navigator.clipboard.writeText(result.share_link);
    }
  };

  return (
    <div className="container">
      <div className="sender-layout">
        {/* Left info panel */}
        <aside className="sender-sidebar">
          <h2>Sender Console</h2>
          <p className="sender-subtext">
            Configure a one-time, password-protected share for your local
            network. Your files never leave the machine that hosts Setu
            Sharing.
          </p>

          <div className="sender-highlights">
            <div className="highlight-pill">
              <span>🔐</span>
              <div>
                <div className="highlight-title">End-to-end control</div>
                <div className="highlight-text">
                  Only users with the URL and password can access your files.
                </div>
              </div>
            </div>
            <div className="highlight-pill">
              <span>⏱️</span>
              <div>
                <div className="highlight-title">Ephemeral sessions</div>
                <div className="highlight-text">
                  Shares can auto-expire after a duration you choose.
                </div>
              </div>
            </div>
            <div className="highlight-pill">
              <span>📶</span>
              <div>
                <div className="highlight-title">LAN optimised</div>
                <div className="highlight-text">
                  Transfers stay inside your network for maximum speed.
                </div>
              </div>
            </div>
          </div>

          <div className="sender-meta">
            <div>
              <div className="meta-label">Host IP suggestion</div>
              <div className="meta-value">{ip || "Loading…"}</div>
            </div>
            <div>
              <div className="meta-label">Default expiry</div>
              <div className="meta-value">24 hours</div>
            </div>
          </div>
        </aside>

        {/* Right main form + result */}
        <section className="sender-main card">
          <header className="sender-header">
            <div>
              <h3>Create a secure share</h3>
              <p className="sender-subtext">
                Point to a folder on this machine and protect it with a
                session password. We&apos;ll generate a share URL and QR code
                for your receiver.
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="form-grid">
            <div>
              <label className="label">Directory path</label>
              <input
                className="input"
                placeholder="e.g. C:\Users\you\Documents\SetuShare"
                value={dirpath}
                onChange={(e) => setDirpath(e.target.value)}
                required
              />
              <p className="helper-text">
                This folder will be made available as read-only to receivers.
              </p>
            </div>

            <div>
              <label className="label">Session password</label>
              <input
                className="input"
                type="password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="helper-text">
                Share this password only with people who should access your
                files.
              </p>
            </div>

            <div className="two-col">
              <div>
                <label className="label">Host IP (LAN)</label>
                <input
                  className="input"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.x.x"
                />
                <p className="helper-text">
                  IP of the machine running the Flask server. Adjust if needed.
                </p>
              </div>
              <div>
                <label className="label">Expiry (minutes)</label>
                <input
                  className="input"
                  type="number"
                  value={expiry}
                  min="0"
                  onChange={(e) => setExpiry(e.target.value)}
                />
                <p className="helper-text">
                  0 or empty = no expiry. For most shares, 30–240 minutes is a
                  good range.
                </p>
              </div>
            </div>

            <div className="sender-actions">
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Creating share…" : "Generate share & QR"}
              </button>
              <span className="sender-hint">
                Your share remains active only while this server is running.
              </span>
            </div>
          </form>

          {error && <div className="error-box">⚠️ {error}</div>}

          {result && (
            <div className="result-box">
              <h4>Share ready</h4>
              <p className="helper-text">
                Send this URL to your receiver or let them scan the QR code
                from their device.
              </p>

              <div className="result-grid">
                <div>
                  <p className="label">Share URL</p>
                  <div className="share-link-row">
                    <code className="share-link-code">
                      {result.share_link}
                    </code>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCopy}
                    >
                      Copy
                    </button>
                  </div>
                  {result.expires_at && (
                    <p className="helper-text">
                      Expires at: <code>{result.expires_at}</code> (UTC)
                    </p>
                  )}
                </div>

                <div>
                  <p className="label">QR code</p>
                  <div className="qr-wrapper">
                    <img
                      src={`${API_BASE}${result.qr_link}`}
                      alt="Share QR"
                      className="qr-image"
                    />
                  </div>
                  <p className="helper-text">
                    Ideal for mobile receivers on the same Wi-Fi network.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Sender;
