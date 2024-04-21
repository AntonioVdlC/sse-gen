type EventHandlerOpen = (event: Event) => void;
type EventHandlerMessage = (event: MessageEvent) => void | Promise<void>;
type EventHandlerError = (event: Event) => void;

class SSEClient {
  protected _url: string;
  protected _eventSource: EventSource | null;

  private _handleMessage?: EventHandlerMessage;
  private _handleError?: EventHandlerError;

  private _eventHandler: AsyncGenerator<
    MessageEvent | undefined,
    unknown,
    MessageEvent
  >;

  get url(): string {
    return this._url;
  }

  constructor(url: string) {
    this._url = url;
    this._eventSource = null;
    this._eventHandler = this._createEventHandler();
    this._eventHandler.next();
  }

  connect(): void {
    if (!this._eventSource) {
      this._eventSource = new EventSource(this._url);
    }

    this._eventSource.onmessage = async (event) => {
      await this._eventHandler.next(event);
    };

    this._eventSource.onerror = (event) => {
      this._handleError?.(event);
    };
  }

  close(): void {
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
    }
  }

  catch(handleError: EventHandlerError): void {
    this._handleError = handleError;
  }

  on(handleMessage: EventHandlerMessage): void {
    this._handleMessage = handleMessage;
  }

  private async *_createEventHandler(): AsyncGenerator<
    MessageEvent | undefined,
    unknown,
    MessageEvent
  > {
    while (true) {
      const event = yield;
      if (event) {
        await this._handleMessage?.(event);
      }
    }
  }
}

export { SSEClient };
export type { EventHandlerOpen, EventHandlerMessage, EventHandlerError };
