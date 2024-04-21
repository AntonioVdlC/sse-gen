import { describe, it, expect, vi } from "vitest";
import { SSEClient as _SSEClient, SSEClientStatus } from "../src";

vi.stubGlobal(
  "EventSource",
  class EventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;

    url: string;

    constructor(url: string) {
      this.url = url;
    }
  },
);

class SSEClient<T> extends _SSEClient<T> {
  constructor(url: string, onStatusUpdate?: (status: SSEClientStatus) => void) {
    super(url, onStatusUpdate);
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
      const client = new SSEClient("http://localhost:3000");

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

      client.connect();
      client.connect();

      expect(client.eventSource).toBe(eventSource);
    });

    it("should connect to the server", () => {
      const client = new SSEClient("http://localhost:3000");

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

      const handleOpen = vi.fn();
      client.connect(handleOpen);

      client._simulateOpen(new Event("open"));

      expect(handleOpen).toHaveBeenCalled();
    });

    it("should update the status", async () => {
      const handleStatusUpdate = vi.fn();
      const client = new SSEClient("http://localhost:3000", handleStatusUpdate);

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

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

      client.close();

      expect(eventSource.close).toHaveBeenCalled();
      expect(client.eventSource).toBeNull();
    });

    it("should update the status", () => {
      const handleStatusUpdate = vi.fn();
      const client = new SSEClient("http://localhost:3000", handleStatusUpdate);

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

      client.close();

      expect(handleStatusUpdate).toHaveBeenCalledWith(SSEClientStatus.CLOSED);
    });
  });

  describe("catch", () => {
    it("should catch errors", () => {
      const client = new SSEClient("http://localhost:3000");

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

      client.connect();

      const error = new Event("error");
      client.catch((event) => {
        expect(event).toBe(error);
      });

      client._simulateError(error);
    });

    it("should close the connection", () => {
      const client = new SSEClient("http://localhost:3000");

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

      client.connect();

      const error = new Event("error");
      client.catch(() => {});

      client._simulateError(error);
      expect(eventSource.close).toHaveBeenCalled();
    });
  });

  describe("on", () => {
    it("should listen to messages", () => {
      const client = new SSEClient("http://localhost:3000");

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

      client.connect();

      const message = new MessageEvent("message", { data: "Hello, world!" });
      client.on((event) => {
        expect(event).toBe(message);
      });

      client._simulateMessage(message);
    });

    it("should await the handler if it returns a promise", async () => {
      const client = new SSEClient("http://localhost:3000");

      const eventSource = mockEventSource();
      client.eventSource = eventSource;

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

  describe("status", () => {
    describe("getter", () => {
      it("should return the status (by default CLOSED)", () => {
        const client = new SSEClient("http://localhost:3000");

        expect(client.status).toBe(SSEClientStatus.CLOSED);
      });
    });
  });
});
