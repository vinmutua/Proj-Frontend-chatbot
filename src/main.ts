import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import AOS from 'aos';
import 'aos/dist/aos.css';

AOS.init();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
