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

## Notes

- The app attempts to fetch pages directly; if a site blocks scraping, it will try a set of public proxy endpoints. You can also paste manual content.
- Gemini's Python client may have different method names across versions; if the app cannot call Gemini directly, copy the generated prompt and run it in your Gemini playground.

## License

MIT

