import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, an uncaught error anywhere in the tree (e.g. a component reading
 * a field that's missing from a stale/legacy profile) unmounts the whole app —
 * a blank white screen with no indication anything went wrong. This catches
 * that and gives the user a way to recover instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
            background: "#0b0b0f",
            color: "#e6e6e6",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 600 }}>Something went wrong loading your data.</p>
          <p style={{ fontSize: 13, opacity: 0.7, maxWidth: 320 }}>
            This can happen after a sync. Reloading usually fixes it — if it keeps happening, let us know.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: "10px 18px",
              borderRadius: 8,
              background: "#e6e6e6",
              color: "#0b0b0f",
              fontWeight: 600,
              border: "none",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
