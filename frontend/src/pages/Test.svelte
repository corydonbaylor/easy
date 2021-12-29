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
  <div class="row">
    {#each data.produce as { name, description }}
      <div class="column">
        <div class="card">
          {name}
          {description}
        </div>
      </div>
    {/each}
  </div>
{/await}

<style>
  /* Float four columns side by side */
  .column {
    float: left;
    width: 45%;
    padding: 0 10px;
  }

  /* Remove extra left and right margins, due to padding in columns */
  .row {
    margin: 0 -5px;
  }

  /* Clear floats after the columns */
  .row:after {
    content: "";
    display: table;
    clear: both;
  }

  /* Style the counter cards */
  .card {
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2); /* this adds the "card" effect */
    padding: 16px;
    text-align: center;
    background-color: #f1f1f1;
  }
</style>
