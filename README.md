# SG CT SEO — AI Content Strategist

A Streamlit-based SEO competitor analysis tool that fetches page content, runs an AI analysis (Gemini recommended), and returns structured, actionable insights.

## Features

- Fetch and parse website content (client + competitors)
- Build a precise prompt and JSON schema for the AI
- Integrates with **Google Gemini** (recommended) or **OpenAI** as a fallback
- Shows strategic overview, content gaps, linkable asset suggestions, and an action plan
- Manual content editor when automated fetching fails

## Running locally

1. Install the requirements

```bash
pip install -r requirements.txt
```

2. Run the app

```bash
streamlit run streamlit_app.py
```

## Configuration & Deployment

- Google Gemini: Provide an API key or credentials in the Streamlit sidebar or via `st.secrets["GOOGLE_API_KEY"]`.
- OpenAI fallback: Provide `OPENAI_API_KEY` in the sidebar or via `st.secrets`.
- For Streamlit Community Cloud, add your secrets in the app settings.

### Deploying to Streamlit Community Cloud (recommended)

1. Go to https://share.streamlit.io and sign in with your GitHub account.
2. Click **"New app"** -> choose this repository (`shikhergoyal/AIContnetApp`) and the `main` branch, and set the main file to `streamlit_app.py`.
3. Under **Advanced**, add the following environment secrets (do NOT commit them to the repo):
   - `GOOGLE_API_KEY` (optional, for Gemini)
   - `OPENAI_API_KEY` (optional, fallback)
4. Click **Deploy**. Streamlit will install `requirements.txt` and run the app.

Notes:
- If a site blocks scraping, use the manual content editor in the app.
- If you want me to complete the deployment for you, provide a Streamlit Community Cloud API token and I can create the app automatically using a workflow (or I can guide you step-by-step).
## Notes

- The app attempts to fetch pages directly; if a site blocks scraping, it will try a set of public proxy endpoints. You can also paste manual content.
- Gemini's Python client may have different method names across versions; if the app cannot call Gemini directly, copy the generated prompt and run it in your Gemini playground.

## License

MIT

