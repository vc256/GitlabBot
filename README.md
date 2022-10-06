# GitlabBot

A simple, lightweight and self-hostable Telegram bot for making notifications on new GitLab commit

Workflow: Gitlab Webhook -> Cloudflare Workers -> Telegram

## Setup

1. Create your Cloudflare Worker

2. Use the codes from `worker.js`

3. Set the `BOT_TOKEN` and `CHAT_ID` environment variables

4. Deploy and Profit $$$

## Important Note

- For simplicity, only one chat/group/channel per bot instance
- Only **push** event is supported, other event types are not covered (right now)
- Contributions are welcome

## Acknowledgements

- Mostly inspired by the @gitlab_bot on Telegram (GPLv3: https://github.com/integram-org/gitlab)