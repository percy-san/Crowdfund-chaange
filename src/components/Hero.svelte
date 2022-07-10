
<script type="text/javascript">
    
</script>

<div class="uk-position-relative">
    <img src="../images/image-hero-desktop.jpg" alt="hero-img">
    <div class="uk-position-top">
        <nav class="uk-navbar-container uk-navbar-transparent" uk-navbar>
            <div class="uk-navbar-left">
                 <a class="uk-navbar-item uk-logo" href="#"><img src="../images/logo.svg" alt="logo"></a>
            </div>
            <div class="uk-navbar-right">
                <ul class="uk-navbar-nav">
                    <li class="max-screen-items"><a href="https://www.frontendmentor.io/challenges">About</a></li>
                    <li class="max-screen-items"><a href="https://www.frontendmentor.io/challenges">Descover</a></li>
                    <li class="max-screen-items"><a href="https://www.frontendmentor.io/challenges">Get Started</a></li>
                    <div class="responsive">
                        <a class="uk-navbar-toggle" uk-navbar-toggle-icon href="#"></a>
                        <div class="dropdown" uk-dropdown="animation: uk-animation-slide-top-small; duration: 800">
                            <ul class="uk-nav uk-dropdown-nav">
                                <li><a href="#">About</a></li>
                                <li class="uk-nav-divider"></li>
                                <li><a href="#">Descover</a></li>
                                <li class="uk-nav-divider"></li>
                                <li><a href="#">Get Started</a></li>
                            </ul>
                        </div>
                    </div>
                </ul>
            </div>
        </nav>
    </div>
</div>

<style type="text/css">
    li a{
        color: white;
        transition: 0.2s ease-in-out;
    }
    li a:hover{
        color: white;
        text-decoration: underline;
    }
    nav{
        padding-right: 50px;
        padding-left: 50px;
    }

    .uk-navbar-toggle{
        color: white;
    }
    .dropdown{
        border-radius: 10px;
    }
    .uk-dropdown-nav li a{
        color: black;
    }

    .responsive{
        display: none;
    }

    @media screen and (max-width: 600px) {
        .responsive{
            display: block;
        }
        .uk-navbar-nav .max-screen-items{display: none}
        nav{
            padding-right: 10px;
            padding-left: 10px;
        }
        .uk.logo{
            width: 10px;
        }
        
}




    

</style>