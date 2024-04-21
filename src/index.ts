type EventHandlerMessage<T> = (event: MessageEvent<T>) => void | Promise<void>;
type EventHandlerError = (event: Event) => void;

type EventHandlerGenerator<T> = AsyncGenerator<
  MessageEvent<T> | undefined,
  void,
  MessageEvent<T>
>;

class SSEClient<T> {
  protected _url: string;
  protected _eventSource: EventSource | null;

  private _handleMessage?: EventHandlerMessage<T>;
  private _handleError?: EventHandlerError;

  private _eventHandler: EventHandlerGenerator<T>;

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

  on(handleMessage: EventHandlerMessage<T>): void {
    this._handleMessage = handleMessage;
  }

  private async *_createEventHandler(): EventHandlerGenerator<T> {
    while (true) {
      const event = yield;
      if (event) {
        await this._handleMessage?.(event);
      }
    }
  }
}

export { SSEClient };
export type { EventHandlerMessage, EventHandlerError };
