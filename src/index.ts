type EventHandlerOpen = (event: Event) => void;
type EventHandlerMessage = (event: MessageEvent) => void;
type EventHandlerError = (event: Event) => void;

class SSEClient {
  protected _url: string;
  protected _eventSource: EventSource | null;

  private _handleMessage?: EventHandlerMessage;
  private _handleError?: EventHandlerError;

  get url(): string {
    return this._url;
  }

  constructor(url: string) {
    this._url = url;
    this._eventSource = null;
  }

  connect(): void {
    if (!this._eventSource) {
      this._eventSource = new EventSource(this._url);
    }

    this._eventSource.onmessage = (event) => {
      if (this._handleMessage) {
        this._handleMessage(event);
      }
    };

    this._eventSource.onerror = (event) => {
      if (this._handleError) {
        this._handleError(event);
      }
    };
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

    this._handleError = handleError;
  }

  on(handleMessage: EventHandlerMessage): void {
    if (!this._eventSource) {
      throw new Error("EventSource is not initialized");
    }

    this._handleMessage = handleMessage;
  }
}

export { SSEClient };
export type { EventHandlerOpen, EventHandlerMessage, EventHandlerError };
