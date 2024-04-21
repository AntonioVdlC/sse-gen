import { describe, it, expect, vi } from "vitest";
import { SSEClient as _SSEClient, SSEClientStatus } from "../src";

vi.stubGlobal(
  "EventSource",
  class EventSource {
    onmessage: ((event: MessageEvent) => void) | null = vi.fn();
    onerror: ((event: Event) => void) | null = vi.fn();
    onopen: ((event: Event) => void) | null = vi.fn();
    close = vi.fn();

    url: string;

    constructor(url: string) {
      this.url = url;
    }
  },
);

class SSEClient<T> extends _SSEClient<T> {
  connect(onOpen?: (event: Event) => void): void {
    super.connect();

    if (onOpen && this._eventSource) {
      this._eventSource.onopen = onOpen;
    }
  }

  get eventSource(): EventSource | null {
    return this._eventSource;
  }

  get reconnect():
    | { attempts: number; maxAttempts: number; delay: number }
    | undefined {
    return this._reconnect;
  }

  _simulateOpen(event: Event) {
    this.eventSource?.onopen?.(event);
  }

  _simulateMessage(event: MessageEvent) {
    this.eventSource?.onmessage?.(event);
  }

  _simulateError(event: Event) {
    this.eventSource?.onerror?.(event);
  }
}

function _for(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

describe("SSEClient", () => {
  describe("connect", () => {
    it("should connect to the server", () => {
      const client = new SSEClient("http://localhost:3000");

      const handleOpen = vi.fn();
      client.connect(handleOpen);

      client._simulateOpen(new Event("open"));

      expect(handleOpen).toHaveBeenCalled();
    });

    it("should update the status", async () => {
      const handleStatusUpdate = vi.fn();
      const client = new SSEClient("http://localhost:3000", {
        onStatusUpdate: handleStatusUpdate,
      });

      client.connect();
      expect(handleStatusUpdate).toHaveBeenCalledWith(
        SSEClientStatus.CONNECTING,
      );

      client._simulateOpen(new Event("open"));

      expect(handleStatusUpdate).toHaveBeenCalledWith(SSEClientStatus.OPEN);
    });
  });

  describe("close", () => {
    it("should close the connection", () => {
      const client = new SSEClient("http://localhost:3000");

      client.connect();
      const eventSource = client.eventSource;
      client.close();

      expect(eventSource!.close).toHaveBeenCalled();
      expect(client.eventSource).toBeNull();
    });

    it("should update the status", () => {
      const handleStatusUpdate = vi.fn();
      const client = new SSEClient("http://localhost:3000", {
        onStatusUpdate: handleStatusUpdate,
      });

      client.connect();
      client.close();

      expect(handleStatusUpdate).toHaveBeenCalledWith(SSEClientStatus.CLOSED);
    });
  });

  describe("catch", () => {
    it("should catch errors", () => {
      const client = new SSEClient("http://localhost:3000");

      client.connect();

      const error = new Event("error");
      client.catch((event) => {
        expect(event).toBe(error);
      });

      client._simulateError(error);
    });

    it("should close the connection", () => {
      const client = new SSEClient("http://localhost:3000");

      client.connect();
      const eventSource = client.eventSource;

      const error = new Event("error");
      client.catch(() => {});

      client._simulateError(error);
      expect(eventSource!.close).toHaveBeenCalled();
    });
  });

  describe("on", () => {
    it("should listen to messages", () => {
      const client = new SSEClient("http://localhost:3000");

      client.connect();

      const message = new MessageEvent("message", { data: "Hello, world!" });
      client.on((event) => {
        expect(event).toBe(message);
      });

      client._simulateMessage(message);
    });

    it("should await the handler if it returns a promise", async () => {
      const client = new SSEClient("http://localhost:3000");

      client.connect();

      const events: Array<MessageEvent> = [];
      const message_1 = new MessageEvent("message", { data: "Hello, world!" });
      const message_2 = new MessageEvent("message", { data: "Hello, world!" });
      const message_3 = new MessageEvent("message", { data: "Hello, world!" });

      client.on(async (event) => {
        await _for(50);
        events.push(event);
      });

      expect(events).toEqual([]);
      client._simulateMessage(message_1);
      await _for(70);
      expect(events).toEqual([message_1]);

      client._simulateMessage(message_2);
      client._simulateMessage(message_3);
      expect(events).toEqual([message_1]);
      await _for(70);
      expect(events).toEqual([message_1, message_2]);
      await _for(70);
      expect(events).toEqual([message_1, message_2, message_3]);
    });
  });

  describe("reconnect", () => {
    it("should not try to reconnect if option is not set", () => {
      const client = new SSEClient("http://localhost:3000");

      client.connect();

      const error = new Event("error");
      client._simulateError(error);

      expect(client.status).toBe(SSEClientStatus.CLOSED);
    });

    it("should try to reconnect if option is set (success)", async () => {
      const client = new SSEClient("http://localhost:3000", {
        reconnect: {
          maxAttempts: 3,
          delay: 50,
        },
      });

      client.connect();

      const error = new Event("error");
      client._simulateError(error);

      expect(client.status).toBe(SSEClientStatus.CLOSED);
      expect(client.reconnect?.attempts).toBe(1);

      await _for(70);
      expect(client.status).toBe(SSEClientStatus.CONNECTING);
      client._simulateOpen(new Event("open"));

      expect(client.status).toBe(SSEClientStatus.OPEN);
      expect(client.reconnect?.attempts).toBe(0);
    });

    it("should try to reconnect if option is set (failed)", async () => {
      class SSEClient_Reconnect<T> extends SSEClient<T> {
        connect() {
          if (!this._eventSource) {
            this._eventSource = new EventSource(this.url);
          }
          this._updateStatus(SSEClientStatus.CONNECTING);
          this._eventSource.onerror = () => {
            this.close();
            this._handleReconnect();
          };
        }
      }

      const client = new SSEClient_Reconnect("http://localhost:3000", {
        reconnect: {
          maxAttempts: 3,
          delay: 50,
        },
      });

      client.connect();

      const error = new Event("error");
      client._simulateError(error);

      expect(client.status).toBe(SSEClientStatus.CLOSED);
      expect(client.reconnect?.attempts).toBe(1);

      await _for(70);
      expect(client.status).toBe(SSEClientStatus.CONNECTING);
      client._simulateError(error);
      expect(client.reconnect?.attempts).toBe(2);

      await _for(70);
      expect(client.status).toBe(SSEClientStatus.CONNECTING);
      client._simulateError(error);
      expect(client.reconnect?.attempts).toBe(3);

      await _for(70);
      expect(client.status).toBe(SSEClientStatus.CONNECTING);
      client._simulateError(error);

      await _for(70);
      expect(client.status).toBe(SSEClientStatus.CLOSED);
    });
  });

  describe("url", () => {
    describe("getter", () => {
      it("should return the URL", () => {
        const client = new SSEClient("http://localhost:3000");

        expect(client.url).toBe("http://localhost:3000");
      });
    });
  });

  describe("status", () => {
    describe("getter", () => {
      it("should return the status (by default CLOSED)", () => {
        const client = new SSEClient("http://localhost:3000");

        expect(client.status).toBe(SSEClientStatus.CLOSED);
      });
    });
  });
});
