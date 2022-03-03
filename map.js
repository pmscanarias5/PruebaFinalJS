require(["esri/map",
  "dojo/on",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/FeatureLayer",

  "dojo/_base/Color",
  "dojo/_base/array",
  
  "esri/geometry/Extent",
  
  "dojo/dom",
  
  "dojo/parser",
  "dojo/ready",
  "esri/tasks/locator",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/Font",
  "esri/symbols/TextSymbol",
  "esri/graphic",

  "esri/tasks/GeometryService",
  "esri/config",

  "esri/tasks/BufferParameters",
  "dojo/_base/array",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",


  "esri/dijit/Legend",
  "esri/dijit/Search",
  "esri/dijit/BasemapGallery",
  "esri/dijit/Scalebar",
  "esri/dijit/OverviewMap",
  "esri/dijit/PopupTemplate",

  "esri/tasks/QueryTask",
  "esri/tasks/query",

  "esri/toolbars/draw",

  "esri/tasks/Geoprocessor",
  "esri/tasks/ServiceAreaTask",
  "esri/tasks/ServiceAreaParameters",
  "esri/tasks/FeatureSet",

  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/TitlePane",
  "dijit/layout/TabContainer",
  "dojo/domReady!",
    ],
  function (
    Map,
    on,
    DynamicLayer,
    FeatureLayer,
    Color, array, Extent,
    dom,parser, ready, Locator,
    SimpleMarkerSymbol, Font,
    TextSymbol, Graphic,
    
    GeometryService, Config,
    BufferParameters, array,
    SimpleFillSymbol,
    SimpleLineSymbol,

    Legend,
    Search,
    BasemapGallery,
    Scalebar,
    OverviewMap,
    PopupTemplate,
    QueryTask,
    Query,

    Draw,

    Geoprocessor,
    ServiceAreaTask,
    ServiceAreaParameters,
    FeatureSet,

    BorderContainer, ContentPane

  ){
      //1.Creamos el mapa a utilizar en el ejercicio cargando en el la capa necesaria proveniente del CSV

    
      var extensionMapa = new Extent({
        xmin: -422728.5139863391,
        ymin: 4919976.436545625,
        xmax: -393376.695124871,
        ymax: 4933620.446094511,
        spatialReference: {
           wkid: 102100
        }
      })
      var myMap = new Map('mapa',{
          basemap: 'dark-gray',
          extent: extensionMapa

      })

      var capaCentrosSalud = new FeatureLayer('https://services5.arcgis.com/zZdalPw2d0tQx8G1/ArcGIS/rest/services/CENTROS_SALUD/FeatureServer/0')

      myMap.addLayer(capaCentrosSalud)

      myMap.on('load', mapaCargado)



      function mapaCargado(){

        //2.Preparamos el GP de Service Area específico de network analysis.

        //Primero ejecutamos una consulta sobre la feature layer para obtener las entidadesd de la misma

        var querytask = new QueryTask('https://services5.arcgis.com/zZdalPw2d0tQx8G1/ArcGIS/rest/services/CENTROS_SALUD/FeatureServer/0')
        var consultaFeatureSet = new Query()

        consultaFeatureSet.where = '1 = 1'
        consultaFeatureSet.returnGeometry = true
        consultaFeatureSet.outFields = ['*']
  
        querytask.execute(consultaFeatureSet, obtenerFeatureSet)
  
        var featureTodas = []
        var tareaAreaServicio = new ServiceAreaTask('https://formacion.esri.es/server/rest/services/RedMadrid/NAServer/Service%20Area')

        //Antes de nada creamos tres colores distintos para cada una de las barreras de tiempo:

        var colorPrimerRing = new SimpleFillSymbol();
        colorPrimerRing.setColor(new Color([230, 0, 0, 0.4]));
        
        var colorSegundoRing = new SimpleFillSymbol();
        colorSegundoRing.setColor(new Color([255, 255, 0, 0.5]));   

        var colorTercerRing = new SimpleFillSymbol();
        colorTercerRing.setColor(new Color([85, 255, 0, 0.61]));
        
        //Ejecutamos la funcion proveniente de la seleccion de entidades despues del query
        function obtenerFeatureSet(featureSetObtenido){

            myMap.graphics.clear(); //clear existing graphics
            //Defino una simbologia transparente para poder crear grafico necesario para featureSet
            var pointSymbol = new SimpleMarkerSymbol(
              "diamond",
              20,
              new SimpleLineSymbol(
                "solid",
                new Color([88,116,152,0]), 2
              ),
              new Color([88,116,152,0])
            );

            //Aquí se recoge las entidades de la query
            featureTodas = featureSetObtenido.features

            //Ahora hacemos un bucle para ir sacando la geometria de cada uno de los centros de salud y meterlos en un FeatureSet individualmente

            for (let centroSalud of featureTodas){
                var location = new Graphic(centroSalud.geometry, pointSymbol);
                var features = [];
                features.push(location);
                var facilities = new FeatureSet();
                facilities.features = features;


                //Ahora se crean los parámetros de la tarea de area de servicio
                var params = new ServiceAreaParameters();
                params.facilities = facilities
                params.defaultBreaks = [3,5,10]
                params.impedanceAttribute = 'TiempoPie'
                params.overlapPolygons = true

                //Por último ejecutamos la funcion de solve 
                    
                tareaAreaServicio.solve(params, funcionEjecutar, funcionFallo)
        
                function funcionEjecutar(resultadoGP){
                    console.log(resultadoGP)
                    var geomPoligono1 = resultadoGP.serviceAreaPolygons[0].geometry
                    myMap.graphics.add(new Graphic(geomPoligono1, colorPrimerRing))

                    var geomPoligono2 = resultadoGP.serviceAreaPolygons[1].geometry
                    myMap.graphics.add(new Graphic(geomPoligono2, colorSegundoRing))

                    var geomPoligono3 = resultadoGP.serviceAreaPolygons[2].geometry
                    myMap.graphics.add(new Graphic(geomPoligono3, colorTercerRing))                    
                }        
                function funcionFallo(){
                    console.log('Ha fallado el solve')
                }                
            }
            }
        }    
      }    
  )

//Algunos puntos de los centros de salud dan problema al ejecutarse el ServiceArea y en la consola salta con un error, pero se dibujan bien casi todos