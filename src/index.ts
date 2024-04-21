type EventHandlerMessage<T> = (event: MessageEvent<T>) => void | Promise<void>;
type EventHandlerError = (event: Event) => void;

type EventHandlerGenerator<T> = AsyncGenerator<
  MessageEvent<T> | undefined,
  void,
  MessageEvent<T>
>;

enum SSEClientStatus {
  CONNECTING = "CONNECTING",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}

class SSEClient<T> {
  protected _url: string;
  protected _eventSource: EventSource | null;

  private _handleMessage?: EventHandlerMessage<T>;
  private _handleError?: EventHandlerError;

  private _eventHandler: EventHandlerGenerator<T>;

  protected _status: SSEClientStatus = SSEClientStatus.CLOSED;
  private _onStatusUpdate?: (status: SSEClientStatus) => void;

  get url(): string {
    return this._url;
  }

  get status(): SSEClientStatus {
    return this._status;
  }

  constructor(url: string, onStatusUpdate?: (status: SSEClientStatus) => void) {
    this._url = url;
    this._eventSource = null;
    this._eventHandler = this._createEventHandler();
    this._eventHandler.next();
    this._onStatusUpdate = onStatusUpdate;
  }

  connect(): void {
    if (!this._eventSource) {
      this._eventSource = new EventSource(this._url);
      this._updateStatus(SSEClientStatus.CONNECTING);
    }

    this._eventSource.onopen = () => {
      this._updateStatus(SSEClientStatus.OPEN);
    };

    this._eventSource.onmessage = async (event) => {
      await this._eventHandler.next(event);
    };

    this._eventSource.onerror = (event) => {
      this._handleError?.(event);
      this.close();
    };
  }

  close(): void {
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
      this._updateStatus(SSEClientStatus.CLOSED);
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

  private _updateStatus(status: SSEClientStatus): void {
    this._status = status;
    this._onStatusUpdate?.(status);
  }
}

export { SSEClient, SSEClientStatus };
export type { EventHandlerMessage, EventHandlerError };
