<script>
  async function getData() {
    let response = await fetch("./location");
    let users = await response.json();
    console.log(users);
    return users;
  }
  const promise = getData();
</script>

{#await promise}
  <h3>Loading...</h3>
{:then data}
  <h3>
    In {data.state} during {data.period}
    {data.month}, the following produce is in season:
  </h3>
  <div class="container">
    {#each data.produce as { name, description }}
      <div class="card-wrap">
        <div class="card">
          <span class="title">{name}</span>
          <br />
          <span class="text">{description}</span>
        </div>
      </div>
    {/each}
  </div>
{/await}

<style>
  /* Float four columns side by side */

  * {
    box-sizing: border-box;
  }

  .container {
    display: flex;
    flex-flow: row wrap;
  }

  .card-wrap {
    flex: 0 0 33.333%;
    display: flex;
    padding: 10px; /* gutter width */
  }

  .card {
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
    flex: 0 0 100%;
    padding: 16px;
    background-color: #f1f1f1;
    text-align: center;
  }

  .title {
    font-weight: bold;
  }
</style>
