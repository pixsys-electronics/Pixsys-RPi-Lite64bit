(function($){
    $.fn.filetree = function(method){
       
        var settings = { // settings to expose
            animationSpeed      : 'fast',            
            collapsed           : true,
            console             : false
        }
        var methods = {
            init : function(options){
                // Get standard settings and merge with passed in values
                var options = $.extend(settings, options); 
                // Do this for every file tree found in the document
                return this.each(function(){
                    
                    var $fileList = $(this);
                   
                    $fileList
                        .addClass('file-list')
                        .find('li')   
                        .has('ul') // Any li that has a list inside is a folder root
                            .addClass('folder-root closed')
                            .on('click', 'a[href="#"]', function(e){ // Add a click override for the folder root links
                                e.preventDefault();

                                // chiudo il padre solo se era gia' aperto e selezionato, di modo che non mi collassi i figli visibili quando navigo su un nodo padre
                                if (this.parentElement.classList.contains("open") && this.classList.contains("selected"))
                                {
                                    this.parentElement.classList.remove("open");
                                    this.parentElement.classList.add("closed");
                                }
                                else
                                {
                                    this.parentElement.classList.remove("closed");
                                    this.parentElement.classList.add("open");
                                }

                                // rimuovo il precedentemente selezionato
                                let elem = document.querySelector(".file-list li .selected");
                                if (elem)
                                    elem.classList.remove("selected");

                                // aggiungo il nuovo selezionato
                                this.classList.add("selected");

                                return false;
                            });
                    
                    //alert(options.animationSpeed); Are the settings coming in

                });
                
                
            }
        }
        
        

        
        if (typeof method === 'object' || !method){
            return methods.init.apply(this, arguments);
        } else {
            $.on( "error", function(){
                console.log(method + " does not exist in the file exploerer plugin");
            } );
        }  
    }
    
}(jQuery));