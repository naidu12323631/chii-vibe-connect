import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useSavedPlans, useSavedPosts } from "@/hooks/useLocalPrefs";

// Two independent components using the hook must stay in sync — a bookmark
// toggled on a plan card has to update the "Saved" list rendered elsewhere.
const Toggler = ({ id }: { id: string }) => {
  const { toggleSaved } = useSavedPlans();
  return <button onClick={() => toggleSaved(id)}>toggle {id}</button>;
};

const SavedCount = () => {
  const { saved } = useSavedPlans();
  return <span data-testid="count">{saved.size}</span>;
};

describe("useSavedPlans", () => {
  it("shares state across separate consumers", () => {
    render(<><Toggler id="plan-1" /><SavedCount /></>);
    expect(screen.getByTestId("count")).toHaveTextContent("0");

    act(() => { screen.getByText("toggle plan-1").click(); });
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    act(() => { screen.getByText("toggle plan-1").click(); });
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  // This jsdom build ships no working localStorage, which makes it a free test
  // of the fallback path: toggling must still work when storage throws.
  it("keeps working when localStorage is unavailable", () => {
    render(<><Toggler id="plan-2" /><Toggler id="plan-3" /><SavedCount /></>);
    act(() => { screen.getByText("toggle plan-2").click(); });
    act(() => { screen.getByText("toggle plan-3").click(); });
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });
});

const PostToggler = ({ id }: { id: string }) => {
  const { toggleSavedPost } = useSavedPosts();
  return <button onClick={() => toggleSavedPost(id)}>toggle post {id}</button>;
};

const PostSummary = () => {
  const { savedPosts, isPostSaved } = useSavedPosts();
  const { saved } = useSavedPlans();
  return (
    <>
      <span data-testid="post-count">{savedPosts.size}</span>
      <span data-testid="post-a">{String(isPostSaved("post-a"))}</span>
      <span data-testid="plan-count">{saved.size}</span>
    </>
  );
};

describe("useSavedPosts", () => {
  it("shares state across consumers and reports membership", () => {
    render(<><PostToggler id="post-a" /><PostSummary /></>);
    expect(screen.getByTestId("post-a")).toHaveTextContent("false");

    act(() => { screen.getByText("toggle post post-a").click(); });
    expect(screen.getByTestId("post-count")).toHaveTextContent("1");
    expect(screen.getByTestId("post-a")).toHaveTextContent("true");
  });

  it("is a separate store from saved plans", () => {
    render(<><PostToggler id="post-b" /><Toggler id="plan-x" /><PostSummary /></>);
    const plansBefore = screen.getByTestId("plan-count").textContent;

    act(() => { screen.getByText("toggle post post-b").click(); });
    // Saving a post must not touch the saved-plans set.
    expect(screen.getByTestId("plan-count")).toHaveTextContent(plansBefore!);
  });
});
