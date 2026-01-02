import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

// Backend base URL – uses same host as frontend, on port 8000
const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000`;

const Receiver = () => {
  const { token: routeToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // For /receive (no token in URL)
  const [tokenInput, setTokenInput] = useState("");

  // Share / auth status
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [statusError, setStatusError] = useState("");

  // Files & path
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);

  // UI controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | size | modified
  const [filterType, setFilterType] = useState("all"); // all | folders | files | images | docs

  // Upload
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // ─────────────────────────────
  // Helper: classify file type
  // ─────────────────────────────
  const getType = (item) => {
    if (item.is_dir) return "folder";
    const mime = item.mime || "";
    if (mime.startsWith("image/")) return "image";
    if (
      mime.includes("pdf") ||
      mime.includes("word") ||
      mime.includes("officedocument") ||
      mime.startsWith("text/")
    ) {
      return "doc";
    }
    return "file";
  };

  const humanSize = (bytes) => {
    if (!bytes && bytes !== 0) return "-";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // ─────────────────────────────
  // Load share status
  // ─────────────────────────────
  const loadShareStatus = async () => {
    if (!routeToken) return;
    setIsLoadingStatus(true);
    setStatusError("");
    try {
      const res = await fetch(`${API_BASE}/api/share/${routeToken}/status`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          throw new Error("Share not found or expired.");
        }
        throw new Error("Failed to verify share status.");
      }

      const data = await res.json();
      setIsAuthed(data.authed);

      if (data.authed) {
        loadFiles("");
      }
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // ─────────────────────────────
  // Authenticate with password
  // ─────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    setStatusError("");
    try {
      const res = await fetch(`${API_BASE}/api/share/${routeToken}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Incorrect password");
      }

      setIsAuthed(true);
      loadFiles("");
    } catch (err) {
      setStatusError(err.message);
    }
  };

  // ─────────────────────────────
  // Files loading
  // ─────────────────────────────
  const loadFiles = async (path) => {
    if (!routeToken) return;
    setFilesLoading(true);
    setStatusError("");
    try {
      const rel = path ? `/${path}` : "";
      const res = await fetch(`${API_BASE}/api/${routeToken}/list${rel}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to load files");

      const data = await res.json();
      setItems(data.items || []);
      setCurrentPath(data.path || path || "");
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setFilesLoading(false);
    }
  };

  const goIntoFolder = (name) => {
    const newPath = currentPath ? `${currentPath}/${name}` : name;
    loadFiles(newPath);
  };

  const goBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    loadFiles(parts.join("/"));
  };

  const handleDownload = (name) => {
    const relPath = currentPath ? `${currentPath}/${name}` : name;
    const url = `${API_BASE}/api/${routeToken}/download/${relPath}`;
    window.open(url, "_blank");
  };

  // ─────────────────────────────
  // Upload handling
  // ─────────────────────────────
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // reset so same file can be reselected
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusError("");

    try {
      const pathPart = currentPath ? `/${currentPath}` : "";
      const url = `${API_BASE}/api/${routeToken}/upload${pathPart}`;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        if (!res.ok) {
          throw new Error(`Upload failed (status ${res.status})`);
        } else {
          throw new Error("Upload failed: unexpected server response");
        }
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.message || `Upload failed (status ${res.status})`);
      }

      await loadFiles(currentPath);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // ─────────────────────────────
  // Clone folder (ZIP archive)
  // ─────────────────────────────
  const handleClone = () => {
    const pathPart = currentPath ? `/${currentPath}` : "";
    const url = `${API_BASE}/api/${routeToken}/archive${pathPart}`;
    window.open(url, "_blank");
  };

  // ─────────────────────────────
  // Derived visible items
  // ─────────────────────────────
  const visibleItems = items
    .filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase().trim());
      if (!matchesSearch) return false;

      const type = getType(item);
      if (filterType === "all") return true;
      if (filterType === "folders" && type === "folder") return true;
      if (filterType === "files" && type !== "folder") return true;
      if (filterType === "images" && type === "image") return true;
      if (filterType === "docs" && type === "doc") return true;
      return false;
    })
    .sort((a, b) => {
      // keep folders on top
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;

      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return (b.size || 0) - (a.size || 0);
      if (sortBy === "modified") return (b.mtime || 0) - (a.mtime || 0);
      return 0;
    });

  // ─────────────────────────────
  // Effects
  // ─────────────────────────────
  useEffect(() => {
    if (routeToken) {
      loadShareStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeToken, location.key]);

  // ─────────────────────────────
  // No token: token entry screen
  // ─────────────────────────────
  if (!routeToken) {
    return (
      <div className="container">
        <div className="card">
          <h2>Access a shared session</h2>
          <p className="sender-subtext">
            Paste the share token you received, or scan the QR code which will
            open this page with the token pre-filled.
          </p>
          <input
            className="input"
            style={{ marginTop: "1rem" }}
            placeholder="Enter share token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <button
            className="btn"
            style={{ marginTop: "0.8rem" }}
            onClick={() => {
              if (tokenInput.trim()) {
                navigate(`/receive/${tokenInput.trim()}`);
              }
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // Status error before auth
  // ─────────────────────────────
  if (statusError && !isAuthed && !isLoadingStatus) {
    return (
      <div className="container">
        <div className="card">
          <h2>Cannot access share</h2>
          <p style={{ marginTop: "0.5rem", color: "#fca5a5" }}>
            {statusError}
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // Loading share status
  // ─────────────────────────────
  if (isLoadingStatus && !isAuthed) {
    return (
      <div className="container">
        <div className="card">
          <h2>Checking share…</h2>
          <p className="helper-text">Validating token and session status.</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // Password screen
  // ─────────────────────────────
  if (!isAuthed) {
    return (
      <div className="container">
        <div className="card">
          <h2>Enter session password</h2>
          <p className="helper-text">
            This share is protected. Ask the sender for the password.
          </p>
          <form onSubmit={handleAuth} style={{ marginTop: "0.8rem" }}>
            <input
              type="password"
              className="input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="btn"
              type="submit"
              style={{ marginTop: "0.8rem" }}
            >
              Unlock files
            </button>
          </form>
          {statusError && (
            <p style={{ marginTop: "0.6rem", color: "#fca5a5" }}>
              ⚠ {statusError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // Authenticated view – file browser
  // ─────────────────────────────
  return (
    <div className="container">
      <div className="card receiver-shell">
        {/* Top toolbar */}
        <div className="receiver-toolbar">
          <div className="receiver-path">
            {currentPath && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goBack}
              >
                ⬅ Back
              </button>
            )}
            <div className="path-info">
              <div className="label">Current folder</div>
              <div className="path-value">{currentPath || "/"}</div>
            </div>
          </div>

          <div className="receiver-controls">
            <input
              className="input receiver-search"
              placeholder="Search by file or folder name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="input receiver-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Sort: Name</option>
              <option value="size">Sort: Size</option>
              <option value="modified">Sort: Modified</option>
            </select>

            <select
              className="input receiver-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Show: All</option>
              <option value="folders">Show: Folders only</option>
              <option value="files">Show: Files only</option>
              <option value="images">Show: Images</option>
              <option value="docs">Show: Documents</option>
            </select>

            <button
              type="button"
              className="btn btn-secondary upload-btn"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "⬆ Upload"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClone}
            >
              ⬇ Clone folder
            </button>

            <input
              type="file"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileSelected}
            />
          </div>
        </div>

        {/* Meta info line */}
        <div className="receiver-meta-line">
          <span className="chip">
            Items: {visibleItems.length} / {items.length}
          </span>
          {filesLoading && <span className="chip">Loading files…</span>}
          {statusError && !filesLoading && (
            <span
              className="chip"
              style={{ borderColor: "#f97373", color: "#fecaca" }}
            >
              ⚠ {statusError}
            </span>
          )}
        </div>

        {/* File list */}
        <div className="file-list">
          <div className="file-list-header">
            <div>Name</div>
            <div>Size</div>
            <div>Modified</div>
            <div>Action</div>
          </div>

          {visibleItems.map((item) => {
            const date = new Date((item.mtime || 0) * 1000);
            const type = getType(item);

            return (
              <div
                key={currentPath + "/" + item.name}
                className="file-row"
              >
                <div
                  className={
                    item.is_dir ? "file-name clickable" : "file-name"
                  }
                  onClick={() => item.is_dir && goIntoFolder(item.name)}
                >
                  <span className="file-icon">
                    {item.is_dir
                      ? "📁"
                      : type === "image"
                      ? "🖼️"
                      : type === "doc"
                      ? "📄"
                      : "📦"}
                  </span>
                  <span>{item.name}</span>
                </div>
                <div>{item.is_dir ? "-" : humanSize(item.size)}</div>
                <div>{item.mtime ? date.toLocaleString() : "-"}</div>
                <div>
                  {!item.is_dir && (
                    <button
                      type="button"
                      className="chip-action"
                      onClick={() => handleDownload(item.name)}
                    >
                      ⬇ Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!filesLoading && visibleItems.length === 0 && (
            <div className="file-row empty-row">
              <div>No items match your search or filters.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Receiver;
