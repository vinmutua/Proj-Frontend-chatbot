import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as AOS from 'aos';
import { PrelineService } from './services/preline.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule  
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'front-ui';

  constructor(private prelineService: PrelineService) {}

  async ngOnInit(): Promise<void> {
    // Initialize AOS
    AOS.init();
    
    // Initialize Preline
    await this.prelineService.init();
  }
}
