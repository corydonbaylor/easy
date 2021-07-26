<script>
  import page from "page";

  import Home from "./pages/Home.svelte";
  import About from "./pages/About.svelte";

  // set default component
  let current = Home;

  // Map routes to page. If a route is hit the current
  // reference is set to the route's component
  page("/", () => (current = Home));
  page("/about", () => (current = About));
  // activate router
  page.start();
</script>

<main>
  <nav>
    <a href="/">home</a>
    <a href="/about">about</a>
  </nav>

  <svelte:component this={current} />
</main>
