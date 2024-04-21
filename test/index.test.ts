import { describe, it, expect, vi } from "vitest";
import { SSEClient as _SSEClient } from "../src";

class SSEClient extends _SSEClient {
  constructor(url: string, eventSource?: EventSource) {
    super(url);
    if (eventSource) {
      this._eventSource = eventSource;
    }
  }

  connect(onOpen?: (event: Event) => void): void {
    super.connect();

    if (onOpen && this._eventSource) {
      this._eventSource.onopen = onOpen;
    }
  }

  get eventSource(): EventSource | null {
    return this._eventSource;
  }

  set eventSource(eventSource: EventSource) {
    this._eventSource = eventSource;
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

function mockEventSource(): EventSource {
  return {
    onmessage: vi.fn(),
    onerror: vi.fn(),
    onopen: vi.fn(),
    close: vi.fn(),
  } as unknown as EventSource;
}

describe("SSEClient", () => {
  describe("connect", () => {
    it("should not create a new EventSource if already connected", () => {
      const eventSource = mockEventSource();
      const client = new SSEClient("http://localhost:3000", eventSource);

      client.connect();
      client.connect();

      expect(client.eventSource).toBe(eventSource);
    });

    it("should connect to the server", () => {
      const eventSource = mockEventSource();
      const client = new SSEClient("http://localhost:3000", eventSource);

      const handleOpen = vi.fn();
      client.connect(handleOpen);

      client._simulateOpen(new Event("open"));

      expect(handleOpen).toHaveBeenCalled();
    });
  });

  describe("close", () => {
    it("should close the connection", () => {
      const eventSource = mockEventSource();
      const client = new SSEClient("http://localhost:3000", eventSource);

      client.connect();
      client.close();

      expect(eventSource.close).toHaveBeenCalled();
      expect(client.eventSource).toBeNull();
    });
  });

  describe("catch", () => {
    it("should catch errors", () => {
      const eventSource = mockEventSource();
      const client = new SSEClient("http://localhost:3000", eventSource);

      client.connect();

      const error = new Event("error");
      client.catch((event) => {
        expect(event).toBe(error);
      });

      client._simulateError(error);
    });

    it("should throw an error if EventSource is not initialized", () => {
      const client = new SSEClient("http://localhost:3000");

      expect(() => {
        client.catch(vi.fn());
      }).toThrowError("EventSource is not initialized");
    });
  });

  describe("on", () => {
    it("should listen to messages if no eventType is passed", () => {
      const eventSource = mockEventSource();
      const client = new SSEClient("http://localhost:3000", eventSource);

      client.connect();

      const message = new MessageEvent("message", { data: "Hello, world!" });
      client.on((event) => {
        expect(event).toBe(message);
      });

      client._simulateMessage(message);
    });

    it("should throw an error if EventSource is not initialized", () => {
      const client = new SSEClient("http://localhost:3000");

      expect(() => {
        client.on(vi.fn());
      }).toThrowError("EventSource is not initialized");
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
});
