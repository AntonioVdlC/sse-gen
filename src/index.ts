type EventHandlerOpen = (event: Event) => void;
type EventHandlerMessage = (event: MessageEvent) => void;
type EventHandlerError = (event: Event) => void;

class SSEClient {
  protected _url: string;
  protected _eventSource: EventSource | null;

  get url(): string {
    return this._url;
  }

  constructor(url: string) {
    this._url = url;
    this._eventSource = null;
  }

  connect(handleOpen?: EventHandlerOpen): void {
    if (!this._eventSource) {
      this._eventSource = new EventSource(this._url);
    }

    if (handleOpen) {
      this._eventSource.onopen = (event) => {
        handleOpen(event);
      };
    }
  }

  close(): void {
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
    }
  }

  catch(handleError: EventHandlerError): void {
    if (!this._eventSource) {
      throw new Error("EventSource is not initialized");
    }

    this._eventSource.onerror = (event) => {
      handleError(event);
    };
  }

  on(handleEvent: EventHandlerMessage): void {
    if (!this._eventSource) {
      throw new Error("EventSource is not initialized");
    }

    this._eventSource.onmessage = (event) => {
      handleEvent(event);
    };
  }
}

export { SSEClient };
export type { EventHandlerOpen, EventHandlerMessage, EventHandlerError };
