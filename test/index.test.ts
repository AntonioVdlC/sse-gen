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

function _for(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
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
  });

  describe("on", () => {
    it("should listen to messages", () => {
      const eventSource = mockEventSource();
      const client = new SSEClient("http://localhost:3000", eventSource);

      client.connect();

      const message = new MessageEvent("message", { data: "Hello, world!" });
      client.on((event) => {
        expect(event).toBe(message);
      });

      client._simulateMessage(message);
    });

    it("should await the handler if it returns a promise", async () => {
      const eventSource = mockEventSource();
      const client = new SSEClient("http://localhost:3000", eventSource);

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

  describe("url", () => {
    describe("getter", () => {
      it("should return the URL", () => {
        const client = new SSEClient("http://localhost:3000");

        expect(client.url).toBe("http://localhost:3000");
      });
    });
  });
});
