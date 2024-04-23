# sse-gen

[![version](https://img.shields.io/npm/v/sse-gen.svg)](http://npm.im/sse-gen)
[![issues](https://img.shields.io/github/issues-raw/antoniovdlc/sse-gen.svg)](https://github.com/sse-gen/issues)
[![downloads](https://img.shields.io/npm/dt/sse-gen.svg)](http://npm.im/sse-gen)
[![license](https://img.shields.io/npm/l/sse-gen.svg)](http://opensource.org/licenses/MIT)

A Server-Sent Event (SSE) client using Generators.

## Installation

This package is distributed via npm:

```
npm install sse-gen
```

## Methods

### Instantiating a client

To instantiate a client, call `new` on the class, and pass it a `url` value.

```ts
const client = new SSEClient<T>("/events");
```

#### options

An optional `options` object can be passed as a second argument.

```ts
type SSEClientOptions = {
  onStatusUpdate?: StatusUpdateHandler;
  reconnect?: { maxAttempts: number; delay: number };
};
```

The use of those options is explained further down this document.

### Connecting to the server

To connect to the server (based on the URL passed to the constructor), call the `connect` method on the instantiated client.

```ts
client.connect();
```

### Closing the connectino to the server

To close the connect to the server, call the `close` method on the instantiated client.

```ts
client.close();
```

### Handle SSE messages

To add an handled for messages sent by the server, pass an `EventHandlerMessage` function to the `on` method.

```ts
client.on((event) => {
  console.log(event.data);
});
```

Note that if you are receiving a JSON string, you might need to parse it using `JSON.parse()`.

#### Asynchronous handler

The main motivation of using a Generator to handle events in this SSE client is the possibility to have asynchronous message handlers. Using a Generator ensures that messages will be processed one by one, and that new messages will wait for the previous messages to be processed.

### Error handling

#### Automatic reconnection

If passed a `reconnect` option to the constructor, the client will try to reconnect automatically.

The number of times the client will try to reconnect is defined by the `maxAttempts` property of the `reconnect` option. The delay between each reconnection attempt is defined by the `delay` property of the `reconnect` option.

```ts
const client = new SSEClient("/events", {
  reconnect: {
    maxAttempts: 3,
    delay: 1000,
  },
});
```

#### Custom error handling

To add further custom error handling, pass an `EventHandlerError` function to the `catch` method.

```ts
client.catch((event) => {
  console.error(event);
});
```

Note that the client calls `close` when receiving an error.

## Getters

### url

To retrieve the URL the client is connected to, use the `url` getter on the instantiated client.

```ts
const client = new SSEClient<T>("/events");
client.url; // "/events"
```

### status

The client can be in different statuses:

```ts
enum SSEClientStatus {
  CONNECTING = "CONNECTING",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}
```

To retrieve the status of the client, use the `status` getter on the instantiated client.

```ts
const client = new SSEClient<T>("/events");
client.connect();
client.status; // "CONNECTING"
// ...
client.status; // "OPEN"
// ...
client.close();
client.status; // "CLOSED"
```

#### Custom status update handler

You can also pass a custom handler for status updates in the constructor.
```ts
const client = new SSEClient("/events", {
  onStatusUpdate: (status) => {
    console.log(status);
  },
});
```
