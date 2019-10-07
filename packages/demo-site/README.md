# BobRTC client

BobRTC is a framework that allows you to easily implement WebRTC in a comfortable and understandable way.

We try to abstract away the difficulties but still allow you to access the raw power of the WebRTC instances when needed.


## Technical overview

The framework tries to make the WebRTC concepts a bit more digestible by representing each connected peer as an instance that you can send and/or receive different types of streams (Video / Audio / Data) from.

WebRTC typically works by connecting peers directly to each other and the most common way of grouping people is by making a server that manages so called "rooms". The server maintains a list of all the peers in a room and distributes information about how to reach all peers to every peer in the current room. The information on the server will never be more than an ID and is therefore completely anonymous.

Direct communication, usernames and other types of sensitive data are just sent peer to peer and never over the server connection. This is what makes WebRTC private and brings trust.


## Server Communication

>>> Client connect
<<< Server assigns UUID to Client
>>> Client asks for peers in room
<<< Server delivers array of all client descriptions in room


## Client to client communication (after receiving list of clients)
>>> Client offers WebRTC connection to all other peers in the room
