<script>
	import Hero from './components/Hero.svelte'
	import MainContainer from './components/MainContainer.svelte'
</script>

<main>
	<Hero />

	<div class="content">
		<MainContainer />
	</div>
</main>


<style type="text/css">
	main{
		position: relative;
		display: flex;
		flex-direction: column;
	}
	.content{
		position: absolute;
		left: 50%;
		top:70%;
		transform: translateX(-50%);

		display: block;
		margin: auto;
		width: 50%;
	}


	@media screen and (max-width: 700px) {
		.content{
			width: 90%;
			top:75%;
		}
	        
	        
	}
</style>