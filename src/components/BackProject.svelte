<script type="text/javascript">
	import Card from '../shared/Cards.svelte'

	let bookmarkChecked = false
	let notBookmark = "Bookmarked"
	let isBookMark = "Bookmarked"



	const handleBookmark = () =>{
		bookmarkChecked = !bookmarkChecked
	}

	
	
</script>


<Card>
	<div class="top-info">
			<h1>Mastercraft Bamboo Monitor Riser</h1>
			<p>A beautiful and handcrafted monitor stand to reduce neck and eye strain</p>
			<div class="top-btns">
				<button class="back-project-btn">
				Back this project</button>
				<div class="bookmark">
						{#if bookmarkChecked}
							<button class="bookmark-btn" class:bookmarked={bookmarkChecked} on:click={handleBookmark}><img src="../images/icon-bookmarked.svg"alt="icon"><span >{notBookmark}</span></button>
						{:else}
							<button class="bookmark-btn" on:click={handleBookmark}><img src="../images/icon-bookmark.svg"alt="icon"><span >{notBookmark}</span></button>

						{/if}
				</div>
			</div>
		</div>
</Card>


<style type="text/css">
	.top-info{
		text-align: center;
	}

	.top-info p{
		color: hsl(0, 0%, 48%);
		font-weight: 400;

	}
	.top-info h1{
		font-weight: 700;
		font-size:28px;
	}
	.top-btns{
		display: flex;
		align-items: center;
		justify-content: space-between;

		padding:15px;
	}

	.back-project-btn{
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
	.bookmark-btn{
		border-radius: 40px;
		border: none;
		cursor: pointer;
		padding: 1px;
	}

	.bookmark-btn span{padding: 10px;}
	.bookmarked{color: hsl(176, 72%, 28%);}
	.bookmarked-img{ filter: grayscale(100%) brightness(80%) sepia(300%) hue-rotate(50deg) saturate(500%); }


	@media screen and (max-width: 450px) {
		.top-info h1{
			font-weight: 700;
			font-size:25px;
		}
		.top-info p{
			color: hsl(0, 0%, 48%);
			font-weight: 400;
			font-size: 16px;

		}
		.top-btns{
			display: grid;
			grid-template-columns: 1fr 1fr;
			grid-template-rows: 1fr;
			grid-gap: 2px;
			justify-content:center;
		}
		.bookmark-btn span{
			display: none;
		}
		  
	        
	}
	
</style>