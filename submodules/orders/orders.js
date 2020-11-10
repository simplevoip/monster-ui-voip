define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		moment = require('moment'),
		datatables = require('datatables'),
		monster = require('monster'),
		timezone = require('monster-timezone');

	var app = {

		requests: {},

		subscribe: {
			'voip.orders.render': 'ordersRender'
		},

		appFlags: {},

		deviceIcons: {},

		/* Orders */
		ordersRender: function(args) {
			var self = this,
				args = args || {},
				parent = args.parent || $('.right-content'),
				_orderId = args.orderId,
				_sortBy = args.sortBy,
				callback = args.callback;

			self.ordersGetData(function(data) {
				var template = $(self.getTemplate({
						name: 'layout',
						data: data,
						submodule: 'orders'
					}));

				parent
					.empty()
					.append(template);

				self.ordersRenderTables(data);

				callback && callback();
			});
		},

		ordersGetData: function(callback) {
			var self = this;

			monster.request({
				resource: 'sv.orders.list',
				data: {
					accountId: self.accountId
				},
				success: function(data) {
					callback && callback(data);
				},
				error: function() {
					console.log('Failed to retrieve orders');
				}
			});
		},

		ordersRenderTables: function(orders) {
			var self = this;

			orders.data.forEach(function(order, index) {
				//  concatenate DIDs
				var did_ary = [],
					matches = [],
					regex = /([0-9]+)/m;
				if (order.did.length) {
					if ((m = regex.exec(order.did)) !== null) {
						did_ary.push(m[0]);
					}
				}
				if (order.orderType === 'LNP') {
					if (order.did2 && order.did2.length) {
						if ((m = regex.exec(order.did2)) !== null) {
							did_ary.push(m[0]);
						}
					}
					if (order.did3 && order.did3.length) {
						if ((m = regex.exec(order.did3)) !== null) {
							did_ary.push(m[0]);
						}
					}
					if (order.did4 && order.did4.length) {
						if ((m = regex.exec(order.did4)) !== null) {
							did_ary.push(m[0]);
						}
					}
				}
				orders.data[index].phoneNumbers = '';
				if (did_ary.length) {
					orders.data[index].phoneNumbers = did_ary.join('<br>');
				}
			});

			var quotes = orders.data.filter(function(order) {
				var due_date = order.duedate !== '0000-00-00' ? order.duedate : '',
					due_date_days_diff = -9999;
				if (due_date.length) {
					var now_dt = moment(),
						duedate_dt = moment(due_date),
						duedate_days_diff = duedate_dt.diff(now_dt, 'days');
				}

				var dispatch_config_status_complete = false;
				if (order.orderType === 'DISPATCH') {
					dispatch_config_status_complete = order.config_status_complete
				}

				return (
					(order.orderStatus === 'PENDING' && (order.customerApprovalDate === null || order.customerApprovalDate === '0000-00-00' || order.customerApprovalDate === ''))
					&& (
						(order.orderType === 'NEWSITE' && order.duedate !== '0000-00-00' && duedate_days_diff > -1 && order.totalItems > 0)
						|| (order.orderType === 'EQUIPMENT' && order.totalItems > 0)
						|| (order.orderType === 'DISPATCH' && order.totalItems > 0 && dispatch_config_status_complete)
						|| (order.orderType === 'LNP' && order.did.length)
					)
				);
			});

			if (quotes.length) {
				var quotes_table = $('#table_quotes').DataTable({
					destroy: true,
					data: quotes,
					createdRow: (row, data, dataIndex) => {
						$(row).attr('data-id', data.orderID);
					},
					columns: [
						{
							title: 'ID',
							data: 'orderID',
							render: self.render_quote_id,
						},
						{ title: 'Due', data: 'duedate' },
						{ title: 'Type', data: 'orderType' },
						{ title: 'Site', data: 'siteNumber' },
						{ title: 'Phone #', data: 'phoneNumbers' },
						{ title: 'City', data: 'city' },
						{ title: 'State', data: 'state' },
						{ title: 'Created', data: 'createdate' },
						{
							title: 'NRC',
							data: 'totalNRC',
							render: self.render_dollars
						},
						{
							title: 'MRC',
							data: 'totalMRC',
							render: self.render_dollars
						},
					],
					order: [
						[0, 'asc'],
					],
					language: {
						paginate: {
							previous: '&larr;',
							next: '&rarr;',
						},
					},
				});
			}

			var non_quote_orders = _.difference(orders.data, quotes, 'orderID');

			if (non_quote_orders.length) {
				var orders_table = $('#table_orders').DataTable({
					destroy: true,
					data: non_quote_orders,
					createdRow: (row, data, dataIndex) => {
						$(row).attr('data-id', data.orderID);
					},
					columns: [
						{
							title: 'ID',
							data: 'orderID',
							// render: self.render_order_id,
						},
                        { title: 'Site', data: 'siteNumber' },
                        { title: 'Type', data: 'orderType' },
                        { title: 'Installation', data: 'installation' },
                        { title: 'Status', data: 'orderStatus' },
						{ title: 'Due', data: 'duedate' },
                        { title: 'LNP Status', data: 'lnpstatus' },
                        { title: 'FOC Date', data: 'focdate' },
                        { title: 'TNs', data: 'phoneNumbers' },
					],
					order: [
						[0, 'asc'],
					],
					language: {
						paginate: {
							previous: '&larr;',
							next: '&rarr;',
						},
					},
				});
			}
		},

		render_quote_id: function(data, type, row, meta) {
			var self = this;

			if (type === 'display') {
				return `<a href="http://svportal.local/quote.php?orderID=${data}" target="_blank">${data}</a>`;
			}
			return data;
		},

		render_order_id: function(data, type, row, meta) {
			var self = this;

			if (type === 'display') {
				return `<a href="http://svportal.local/quote.php?orderID=${data}" target="_blank">${data}</a>`;
			}
			return data;
		},

		render_dollars: function(data, type, row, meta) {
			var self = this;

			if (type === 'display' && data !== null) {
				return '$' + data.toFixed(2);
			}
			return data;
		}

	};

	return app;
});
