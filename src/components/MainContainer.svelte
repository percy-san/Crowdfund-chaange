<script type="text/javascript">
	import BackProject from './BackProject.svelte'
	import Progress from './Progress.svelte'


	
</script>



<main>
	<img class="logo" src="../images/logo-mastercraft.svg" alt="logo-mastercraft">
	<BackProject />
	<Progress />	
</main>

<style type="text/css">
	main{
		position: relative;
		display: flex;
		flex-direction: column;
		gap:25px;
		padding-bottom: 10px;
		border-radius: 10px;
		height: 100vh;
		background-color: white;
	}

	.logo{
		position: absolute;
		top:-20px;
		left: 50%;
		transform: translateX(-50%);
		width: 35px;
	}
	@media screen and (max-width: 600px) {
	        
	}



</style>