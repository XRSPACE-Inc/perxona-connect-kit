## Run the Express Sample

The sample app is a single Node/Express server that serves two
runnable browser demos, both built on the same
`<sv-presenter>` integration. They are split by
**which side of the work you are looking at**. Both
hold a conversation the avatar speaks aloud.
**Embed** is what it looks like once it is live: a
product page with an avatar answering questions on it, no
controls and nothing on the page about its own configuration.
**Studio** is the console you build that from:
browse the catalog, create and edit chatbots, interrupt
mid-sentence, and switch between a Perxona-hosted chatbot and
your own API key without losing the conversation. Run the server
once, then open either demo. The steps below get you from clone
to a talking avatar.

⚡

Get from clone to a talking avatar in
**5–15 minutes**. You need
**Node `>=22`** and two Connect API
keys — see
[Get Your API Credentials](https://connect.perxona.ai/#credentials).

1. #### Clone the sample

   ```bash
   git clone https://github.com/XRSPACE-Inc/perxona-connect-kit.git
   cd perxona-connect-kit/samples/express
   ```
2. #### Create your local config

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in the three required
   values. The two keys are not interchangeable — the secret
   one stays on the server, the publishable one is what the
   browser is given:

   ```bash
   PERXONA_API_BASE_URL=https://console.perxona.ai/asia
   PERXONA_CONNECT_SECRET_KEY=pxc_...
   PERXONA_CONNECT_PUBLISHABLE_KEY=pxc_...
   ```
3. #### Install dependencies

   ```bash
   npm install
   ```

   Requires Node `>=22`. If your Node is too old,
   `npm install` refuses with a clear upgrade
   message.
4. #### Start the server

   ```bash
   npm run dev    # with live reload (node --watch)
   # or
   npm start      # without watch
   ```

   The terminal prints the local URL, e.g.
   `http://localhost:8083`.
5. #### Launch the avatar

   Open the URL in your browser. The landing page offers two
   demos. In **Studio**, pick an
   **Avatar**, **Scene**, and
   **Voice**, then click
   **Launch Presenter**. In
   **Embed** there is nothing to pick and
   nothing to configure — the avatar and the chatbot are
   resolved for you; just type a message. Either way the
   first line needs a user gesture: browser autoplay policy
   only lets audio start from one, so no avatar anywhere can
   speak on page load. In Studio that gesture is the launch
   click; in Embed it is the message you send.
