/**
 * Server-Sent Event message handler.
 *
 * @template T - The type of the data sent by the server.
 *
 * @param {MessageEvent<T>} event - The message event.
 * @returns {void | Promise<void>}
 */
type EventHandlerMessage<T> = (event: MessageEvent<T>) => void | Promise<void>;
/**
 * Server-Sent Event error handler.
 *
 * @param {Event} event - The error event.
 * @returns {void}
 */
type EventHandlerError = (event: Event) => void;

/**
 * Server-Sent Event message event generator.
 *
 * @template T - The type of the data sent by the server.
 *
 * @type {AsyncGenerator<MessageEvent<T> | undefined, void, MessageEvent<T>>}
 * @yields {MessageEvent<T> | undefined} - The message event.
 * @returns {void}
 */
type EventHandlerGenerator<T> = AsyncGenerator<
  MessageEvent<T> | undefined,
  void,
  MessageEvent<T>
>;

/**
 * SSE client status
 *
 * @enum {string}
 * @property {string} CONNECTING - The client is connecting to the server.
 * @property {string} OPEN - The client is connected to the server.
 * @property {string} CLOSED - The client is disconnected from the server.
 */
enum SSEClientStatus {
  CONNECTING = "CONNECTING",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}
/**
 * Server-Sent Event status update handler.
 *
 * @param {SSEClientStatus} status - The status of the client.
 * @returns {void}
 */
type StatusUpdateHandler = (status: SSEClientStatus) => void;

/**
 * Server-Sent Event client options.
 *
 * @property {StatusUpdateHandler} [onStatusUpdate] - The status update event handler.
 * @property {{ maxAttempts: number; delay: number }} [reconnect] - The reconnect options.
 * @property {number} reconnect.maxAttempts - The maximum number of reconnect attempts.
 * @property {number} reconnect.delay - The delay between reconnect attempts.
 */
type SSEClientOptions = {
  onStatusUpdate?: StatusUpdateHandler;
  reconnect?: { maxAttempts: number; delay: number };
};

/**
 * Server-Sent Events (SSE) client.
 *
 * @template T - The type of the data sent by the server.
 *
 * @constructor
 * @param {string} url - The URL of the server.
 * @param {{ onStatusUpdate?: StatusUpdateHandler; reconnect?: { maxAttempts: number; delay: number } }} [options] - The options.
 * @param {onStatusUpdate} [options.onStatusUpdate] - The status update event handler.
 * @param {reconnect} [options.reconnect] - The reconnect options.
 * @param {number} options.reconnect.maxAttempts - The maximum number of reconnect attempts.
 * @param {number} options.reconnect.delay - The delay between reconnect attempts.
 *
 * @property {string} url - The URL of the server.
 * @property {SSEClientStatus} status - The status of the client.
 *
 * @method connect - Connect to the server.
 * @method close - Close the connection.
 * @method catch - Set the error event handler.
 * @method on - Set the message event handler.
 *
 * @example
 * const client = new SSEClient("/events", {
 *  onStatusUpdate: (status) => {
 *    console.log(status);
 *  },
 *  reconnect: {
 *    maxAttempts: 3,
 *    delay: 1000,
 *  },
 * });
 *
 * client.connect();
 *
 * client.on((event) => {
 *  console.log(event.data);
 * });
 *
 * client.catch((event) => {
 *  console.error(event);
 * });
 *
 * client.close();
 *
 */
class SSEClient<T> {
  /**
   * @protected
   * @type {string} _url - The URL of the server.
   */
  protected _url: string;
  /**
   * @protected
   * @type {EventSource | null} _eventSource - The event source.
   */
  protected _eventSource: EventSource | null;

  /**
   * @private
   * @type {EventHandlerMessage<T> | undefined} _handleMessage - The message event handler.
   */
  private _handleMessage?: EventHandlerMessage<T>;
  /**
   * @private
   * @type {EventHandlerError | undefined} _handleError - The error event handler.
   */
  private _handleError?: EventHandlerError;

  /**
   * @private
   * @type {EventHandlerGenerator<T>} _eventHandler - The event handler generator.
   */
  private _eventHandler: EventHandlerGenerator<T>;

  /**
   * @protected
   * @type {SSEClientStatus} _status - The status of the client.
   */
  protected _status: SSEClientStatus = SSEClientStatus.CLOSED;
  /**
   * @private
   * @type {StatusUpdateHandler} _onStatusUpdate - The status update event handler.
   */
  private _onStatusUpdate?: StatusUpdateHandler;

  /**
   * @protected
   * @type {{ attempts: number; maxAttempts: number; delay: number } | undefined} _reconnect - The reconnect options.
   * @property {number} _reconnect.attempts - The number of reconnect attempts.
   * @property {number} _reconnect.maxAttempts - The maximum number of reconnect attempts.
   * @property {number} _reconnect.delay - The delay between reconnect attempts.
   */
  protected _reconnect?: {
    attempts: number;
    maxAttempts: number;
    delay: number;
  };

  /**
   * @getter
   * @type {string} url - The URL of the server.
   */
  get url(): string {
    return this._url;
  }

  /**
   * @getter
   * @type {SSEClientStatus} status - The status of the client.
   */
  get status(): SSEClientStatus {
    return this._status;
  }

  /**
   * @constructor
   * @param {string} url - The URL of the server.
   * @param {SSEClientOptions} [options] - The options.
   * @returns {SSEClient<T>} - The SSE client.
   */
  constructor(url: string, options?: SSEClientOptions) {
    this._url = url;
    this._eventSource = null;

    this._eventHandler = this._createEventHandler();
    this._eventHandler.next(); // Initialise the generator.

    this._onStatusUpdate = options?.onStatusUpdate;

    if (options?.reconnect) {
      this._reconnect = {
        ...options.reconnect,
        attempts: 0,
      };
    }
  }

  /**
   * Connect to the server.
   * Add an event listener for the open, message, and error events.
   * @returns {void}
   */
  connect(): void {
    this._eventSource = new EventSource(this._url);
    this._updateStatus(SSEClientStatus.CONNECTING);

    this._eventSource.onopen = () => {
      this._updateStatus(SSEClientStatus.OPEN);
      if (this._reconnect) {
        this._reconnect.attempts = 0;
      }
    };

    this._eventSource.onmessage = async (event) => {
      await this._eventHandler.next(event);
    };

    this._eventSource.onerror = (event) => {
      this._handleError?.(event);
      this.close();
      this._handleReconnect();
    };
  }

  /**
   * Close the connection if it is open.
   * @returns {void}
   */
  close(): void {
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
      this._updateStatus(SSEClientStatus.CLOSED);
    }
  }

  /**
   * Set the error event handler.
   * @param {EventHandlerError} handleError - The error event handler.
   * @returns {void}
   *
   * @example
   * client.catch((event) => {
   *  console.error(event);
   * });
   */
  catch(handleError: EventHandlerError): void {
    this._handleError = handleError;
  }

  /**
   * Set the message event handler.
   * @param {EventHandlerMessage<T>} handleMessage - The message event handler.
   * @returns {void}
   *
   * @example
   * client.on((event) => {
   *  console.log(event.data);
   * });
   */
  on(handleMessage: EventHandlerMessage<T>): void {
    this._handleMessage = handleMessage;
  }

  /**
   * Create the event handler generator.
   * @returns {EventHandlerGenerator<T>} - The event handler generator.
   * @yields {MessageEvent<T> | undefined} - The message event.
   * @returns {void}
   */
  private async *_createEventHandler(): EventHandlerGenerator<T> {
    while (true) {
      const event = yield;
      if (event) {
        await this._handleMessage?.(event);
      }
    }
  }

  /**
   * Update the status of the client.
   * Call the status update event handler.
   * @param {SSEClientStatus} status - The status of the client.
   * @returns {void}
   */
  protected _updateStatus(status: SSEClientStatus): void {
    this._status = status;
    this._onStatusUpdate?.(status);
  }

  /**
   * Attempt to reconnect to the server.
   * @returns {void}
   */
  protected _handleReconnect(): void {
    if (this._reconnect) {
      if (this._reconnect.attempts < this._reconnect.maxAttempts) {
        this._reconnect.attempts++;
        setTimeout(() => {
          this.connect();
        }, this._reconnect.delay);
      }
    }
  }
}

export { SSEClient, SSEClientStatus };
export type { EventHandlerMessage, EventHandlerError, StatusUpdateHandler };
