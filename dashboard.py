"""
Streamlit dashboard для жюри и автора проекта.

Запуск: streamlit run dashboard.py

Показывает: общая статистика, география пользователей, прирост
компетенции (pre/post), distribution NPS, топ-сценарии.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st

DB_PATH = os.getenv("DB_PATH", str(Path(__file__).resolve().parent / "spas.db"))


@st.cache_data(ttl=60)
def load_table(name: str) -> pd.DataFrame:
    if not Path(DB_PATH).exists():
        return pd.DataFrame()
    with sqlite3.connect(DB_PATH) as conn:
        return pd.read_sql_query(f"SELECT * FROM {name}", conn)


def main() -> None:
    st.set_page_config(page_title="СПАС — дашборд", layout="wide")
    st.title("📊 СПАС — дашборд проекта")
    st.caption("AI-помощник первой помощи для подростков 14–17 лет")

    users = load_table("users")
    events = load_table("events")
    feedback = load_table("feedback")
    tests = load_table("test_results")

    if users.empty:
        st.info("Нет данных. Запусти бот и попроси нескольких людей пройти сценарий.")
        return

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Пользователей", len(users))
    completions = (events["name"] == "scenario_complete").sum() if not events.empty else 0
    col2.metric("Завершено сценариев", int(completions))
    avg_nps = float(feedback["nps"].mean()) if not feedback.empty and "nps" in feedback.columns else 0.0
    col3.metric("Средний NPS", f"{avg_nps:.1f}")
    if not tests.empty:
        pre = tests[tests.phase == "pre"]
        post = tests[tests.phase == "post"]
        pre_score = float((pre.correct / pre.total).mean()) if not pre.empty else 0.0
        post_score = float((post.correct / post.total).mean()) if not post.empty else 0.0
        col4.metric("Pre / Post (среднее)", f"{pre_score:.0%} → {post_score:.0%}")

    st.subheader("События по дням")
    if not events.empty:
        events["ts"] = pd.to_datetime(events["ts"])
        daily = events.groupby([events["ts"].dt.date, "name"]).size().unstack(fill_value=0)
        st.line_chart(daily)

    st.subheader("Топ-10 сценариев")
    if not events.empty:
        opens = events[events["name"] == "scenario_open"]
        top = opens["payload"].value_counts().head(10)
        st.bar_chart(top)


if __name__ == "__main__":
    main()
