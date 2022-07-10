<script type="text/javascript">
	import ProjectCard from './ProjectCard.svelte'
	import CompleteModal from '../shared/CompleteModal.svelte'
	import {createEventDispatcher} from 'svelte'

	let dispatch = createEventDispatcher()

	export let standType = ""
	export let pledge =""
	export let description=""
	export let amount


	export let left = 0
	let outOfStock = false

	let pledgeToggle = false

	const toggle = () =>{
		pledgeToggle = !pledgeToggle

	}

	const handleAdd = () =>{
		let totalAmount = amount
		left -= 1
		if (left === 0){
			outOfStock = true	
			pledgeToggle = false
		}
		dispatch('addAmount', totalAmount) 
	}
	


	
</script>

<ProjectCard >
	<div class:out-stock={outOfStock}>
		<div class="top">
			<h4>{standType}</h4>
			<p>{pledge}</p>
		</div>
		<div class="middle">
			<p>{description}</p>
		</div>
		<div class="bottom">
			<h2>{left}<span>left</span></h2>
			{#if !outOfStock}
				<button class="pledge-btn"  on:click={toggle}>Pledge</button>
			{:else}
				<button class="pledge-btn" disabled>Out Of Stock</button>

			{/if}
		</div>
		{#if pledgeToggle}
				<div class="pledge-area uk-animation-slide-top-medium">
					<p>Enter your pledge</p>
					<div class="amount-pledge">
						<input type="number" class="amount uk-input" placeholder="$" bind:value={amount}>
						{#if !outOfStock}
							<input type="button" value="Continue" class="continue-btn"  on:click={handleAdd}  uk-toggle="target: #modal-close-default">
						{:else}
							<input type="button" value="Continue" class="continue-btn"  on:click={handleAdd} disabled >
						{/if}
						<CompleteModal/>

					</div>	
				</div>
			{/if}
	</div>
</ProjectCard>



<style type="text/css">
	.top,.bottom{
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h2, h4{
		font-weight: 700;
	}
	.top p{
		color: hsl(176, 50%, 47%);
	}
	p{color: hsl(0, 0%, 48%)}

	.pledge-btn{
		color: white;
		height: 3rem;
		width: 13rem;
		font-size: 16px;
		background-color: hsl(176, 72%, 28%);
		border:none;
		border-radius: 25px;
		padding:5px;
		cursor: pointer;
	}
	.bottom h2{position: relative;}
	.bottom h2 span{
		position: absolute;
		color: hsl(0, 0%, 48%);
		font-size: 15px;
		top: 13px;
		padding-left:5px;


	}

	.pledge-area{
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding:5px;
	}
	.pledge-area p {
		left: 0;
	}

	.amount, .continue-btn{
		border-radius: 25px;
		width: 5rem; 
		height: 3rem;
		cursor: pointer;
	}
	.amount:hover{
		border-color: hsl(176, 72%,28%);
	}
	.continue-btn{
		background-color: hsl(176, 72%,28%);
		color: white;
	}


	.pledge-btn:hover, .continue-btn:hover{
		color: white;
		background-color:hsl(176, 50%, 47%); 
	}

	.out-stock{
		filter: grayscale(100%);
	}

	@media screen and (max-width: 600px) {
		.top,.bottom{
		display: grid;
		}
		.top p{
			margin-top:-15px;
		}
	}
	
</style>