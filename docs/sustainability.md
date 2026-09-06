# Sustainability

## Design

We have decided to make our entire site "dark mode" by default as this requires less energy to display on a screen than a bright website. The design is also mostly comprised of text and icons which are quite sustainable.

## Lazy loading

Both the list of beers on the main page as well as the comments on each beer are lazy loaded. This means that the browser only fetches and loads the beers and comments that are about to appear on the screen when scrolling. This saves a lot of energy as we avoid unnecessary calls to the server and unnecessary loading and rendering of elements that are not visible.

## Fetching

Our fetching does not fetch more data than necessary, saving a lot of bandwidth and energy. For example, when fetching a beer, we only fetch the comments for that beer, not all comments for all beers. We also only fetch the first 10 beers when loading the main page, and then fetch more when the user scrolls down.

## Database

Initially, we used Docker and PostgreSQL as a relational database is capable of handling large datasets in an efficient way. However, due to restrictions on Docker usage, we had to switch our database.

We now use SQLite, a lightweight, file-based relational database, for efficiency and sustainability. Its small footprint saves energy as it doesn't require a separate server process. Plus, its support for complex queries reduces CPU usage by minimizing the need for multiple joins. In addition to SQLite, it is also possible to use MySQL as the database for this project. MySQL is a powerful, open-source relational database system that is very fast and reliable. It can handle large datasets and supports complex queries, similar to SQLite. To use MySQL, please follow the instructions provided [here](../backend/README.md#running-against-mysql). Please note that using MySQL may require more resources than SQLite, but it can provide better performance for larger datasets.

The virtual machine is using MySQL as the database. This is because SQLite is unsuitable for large datasets, and we wanted to demonstrate that our solution can handle large datasets. We wanted to keep SQLite as the default database when cloning the project because it is much easier to set up and use than MySQL. And it does not require a separate server process.

## GraphQL

We use GraphQL to fetch data from the database. This means that we can fetch exactly the data we need and nothing more. This saves a lot of bandwidth and energy.

## Delayed searching, sorting and filtering

The website will not update immediately when you start typing in the searchbar or start selecting filters or sorting methods. Instead, it will wait for the user to press a button confirming their search/choice, and then fetch the results. This saves a lot of bandwidth and energy as we avoid unnecessary calls to the server.

## User handling

Instead of relying on a third party SaaS/BaaS for user handling, we have implemented our own user handling. This way we avoid unnecessary calls to a third party server, saving bandwidth and energy.

## Images

Our icons and images are made with SVG. This means that they are very small in size and can be scaled to any size without losing quality. This is a more sustainable solution than using PNG or JPG images.

## Hosting

Our website is hosted in Norway which means that the data does not have to travel as far as if it was hosted in another country, saving bandwidth and data.

## Dependencies

We have tried to keep our dependencies to a minimum. This means that we avoid unnecessary code and unnecessary updates. Each npm install and npm update requires a lot of energy, so by keeping our dependencies to a minimum we can reduce the energy consumption of our website. We also remove unused dependencies when we no longer need them.

## Caching

Our backend utilizes caching to improve efficiency and sustainability. By storing frequently accessed data in cache, we reduce the need for repeated database queries, saving CPU usage and energy. This also provides faster response times, enhancing user experience while conservely using resources.