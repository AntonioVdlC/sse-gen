export class SSEClient {
  #url: string;
  #eventSource: EventSource | null;

  constructor(url: string) {
    this.#url = url;
    this.#eventSource = null;
  }

  connect(handleOpen?: (event: Event) => void): void {
    if (!this.#eventSource) {
      this.#eventSource = new EventSource(this.#url);
    }

    if (handleOpen) {
      this.#eventSource.onopen = handleOpen;
    }
  }

  close(): void {
    if (this.#eventSource) {
      this.#eventSource.close();
    }
  }

  catch(handleError: (event: Event) => void): void {
    if (this.#eventSource) {
      this.#eventSource.onerror = (event) => {
        handleError(event);
      };
    }
  }

  on(handleEvent: (event: MessageEvent) => void): void {
    if (!this.#eventSource) {
      throw new Error("EventSource is not initialized");
    }

    this.#eventSource.onmessage = handleEvent;
  }

  get url(): string {
    return this.#url;
  }

  set url(url: string) {
    this.#url = url;
  }

  get eventSource(): EventSource {
    if (!this.#eventSource) {
      throw new Error("EventSource is not initialized");
    }

    return this.#eventSource;
  }

  set eventSource(eventSource: EventSource) {
    this.#eventSource = eventSource;
  }
}
