import { describe, it, expect, vi } from "vitest";
import { SSEClient as _SSEClient } from "../src";

class SSEClient extends _SSEClient {
  constructor(url: string, eventSource?: EventSource) {
    super(url);
    if (eventSource) {
      this.eventSource = eventSource;
    }
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
  });

  describe("url", () => {
    describe("getter", () => {
      it("should return the URL", () => {
        const client = new SSEClient("http://localhost:3000");

        expect(client.url).toBe("http://localhost:3000");
      });
    });
    describe("setter", () => {
      it("should set the URL", () => {
        const client = new SSEClient("http://localhost:3000");

        client.url = "http://localhost:3001";

        expect(client.url).toBe("http://localhost:3001");
      });
    });
  });

  describe("eventSource", () => {
    describe("getter", () => {
      it("should throw an error if EventSource is not initialized", () => {
        const client = new SSEClient("http://localhost:3000");

        expect(() => client.eventSource).toThrowError(
          "EventSource is not initialized",
        );
      });
      it("should return the EventSource", () => {
        const eventSource = mockEventSource();
        const client = new SSEClient("http://localhost:3000", eventSource);

        expect(client.eventSource).toBe(eventSource);
      });
    });
    describe("setter", () => {
      it("should set the EventSource", () => {
        const eventSource = mockEventSource();
        const client = new SSEClient("http://localhost:3000");

        client.eventSource = eventSource;

        expect(client.eventSource).toBe(eventSource);
      });
    });
  });
});
